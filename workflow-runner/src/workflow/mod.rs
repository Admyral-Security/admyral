mod ai_action;
mod context;
mod execution_state;
pub mod executor;
pub mod http_client;
mod http_request_action;
mod if_condition_action;
mod integration_action;
mod manual_start_action;
mod reference_resolution;
mod send_email_action;
mod utils;
mod webhook_action;

use self::executor::WorkflowExecutor;
use crate::postgres::Database;
use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use context::Context;
use enum_dispatch::enum_dispatch;
use http_client::ReqwestClient;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::borrow::Borrow;
use std::collections::HashMap;
use std::sync::Arc;

lazy_static! {
    static ref WORKFLOW_RUN_TIMEOUT_IN_SECONDS: AsyncOnce<Option<u64>> = AsyncOnce::new(async {
        match std::env::var("WORKFLOW_RUN_TIMEOUT_IN_MINUTES") {
            Err(_) => None,
            Ok(timeout) => {
                if timeout.is_empty() {
                    return None;
                }
                Some(
                    timeout
                        .parse::<u64>()
                        .expect("WORKFLOW_RUN_TIMEOUT_IN_MINUTES is not a valid number!")
                        * 60,
                )
            }
        }
    });
}

pub type ReferenceHandle = String;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeType {
    Default,
    True,
    False,
}

impl EdgeType {
    fn from_str(s: &str) -> Result<Self, &'static str> {
        match s.to_uppercase().as_str() {
            "DEFAULT" => Ok(EdgeType::Default),
            "TRUE" => Ok(EdgeType::True),
            "FALSE" => Ok(EdgeType::False),
            _ => Err("Invalid input string for EdgeType"),
        }
    }
}

#[enum_dispatch]
pub trait ActionExecutor {
    async fn execute(&self, context: &context::Context) -> Result<serde_json::Value>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[enum_dispatch(ActionExecutor)]
pub enum ActionNode {
    Webhook(webhook_action::Webhook),
    HttpRequest(http_request_action::HttpRequest),
    IfCondition(if_condition_action::IfCondition),
    AiAction(ai_action::AiAction),
    SendEmail(send_email_action::SendEmail),
    ManualStart(manual_start_action::ManualStart),
    Integration(integration_action::Integration),
}

impl ActionNode {
    fn from(
        action_name: &str,
        action_type: &str,
        action_definition: serde_json::Value,
    ) -> Result<Self> {
        match action_type {
            "WEBHOOK" => Ok(Self::Webhook(webhook_action::Webhook::default())),
            "HTTP_REQUEST" => Ok(Self::HttpRequest(
                http_request_action::HttpRequest::from_json(action_name, action_definition)?,
            )),
            "IF_CONDITION" => Ok(Self::IfCondition(
                if_condition_action::IfCondition::from_json(action_name, action_definition)?,
            )),
            "AI_ACTION" => Ok(Self::AiAction(ai_action::AiAction::from_json(
                action_name,
                action_definition,
            )?)),
            "SEND_EMAIL" => Ok(Self::SendEmail(send_email_action::SendEmail::from_json(
                action_name,
                action_definition,
            )?)),
            "MANUAL_START" => Ok(Self::ManualStart(
                manual_start_action::ManualStart::default(),
            )),
            "INTEGRATION" => Ok(Self::Integration(
                integration_action::Integration::from_json(action_name, action_definition)?,
            )),
            _ => Err(anyhow!("Unknown action type: {action_type}")),
        }
    }

    fn type_as_str(&self) -> &str {
        match self {
            Self::Webhook(_) => "WEBHOOK",
            Self::HttpRequest(_) => "HTTP_REQUEST",
            Self::IfCondition(_) => "IF_CONDITION",
            Self::AiAction(_) => "AI_ACTION",
            Self::SendEmail(_) => "SEND_EMAIL",
            Self::ManualStart(_) => "MANUAL_START",
            Self::Integration(_) => "INTEGRATION",
        }
    }

    fn is_if_condition(&self) -> bool {
        match self {
            Self::IfCondition(_) => true,
            _ => false,
        }
    }

    fn is_start_node(&self) -> bool {
        match self {
            Self::Webhook(_) | Self::ManualStart(_) => true,
            _ => false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Action {
    pub id: String,
    pub name: String,
    pub reference_handle: ReferenceHandle,
    pub node: ActionNode,
}

#[derive(Debug, Clone)]
pub struct Workflow {
    pub workflow_id: String,
    pub workflow_name: String,
    pub is_live: bool,
    pub adj_list: HashMap<String, Vec<(ReferenceHandle, EdgeType)>>,
    pub actions: HashMap<String, Action>,
}

impl Workflow {
    pub async fn load_from_db(workflow_id: &str, db: &dyn Database) -> Result<Self> {
        let (workflow, action_rows, edges) = db.fetch_workflow_data(workflow_id).await?;

        let mut actions = HashMap::new();
        for action_row in action_rows {
            let action_id = action_row.action_id.clone();
            let node = ActionNode::from(
                &action_row.action_name,
                &action_row.action_type,
                action_row.action_definition,
            )?;
            let parsed_action = Action {
                id: action_row.action_id,
                name: action_row.action_name,
                reference_handle: action_row.reference_handle,
                node,
            };
            actions.insert(action_id, parsed_action);
        }

        let mut adj_list = HashMap::new();
        edges.into_iter().for_each(|edge_row| {
            let edge_type = EdgeType::from_str(&edge_row.edge_type).expect("Illegal edge type!");

            adj_list
                .entry(edge_row.parent_action_id)
                .and_modify(|children: &mut Vec<(String, EdgeType)>| {
                    children.push((edge_row.child_action_id.clone(), edge_type))
                })
                .or_insert_with(|| vec![(edge_row.child_action_id, edge_type)]);
        });

        Ok(Self {
            workflow_id: workflow.workflow_id,
            workflow_name: workflow.workflow_name,
            is_live: workflow.is_live,
            adj_list,
            actions,
        })
    }
}

pub async fn run_workflow(
    workflow_id: String,
    start_action_id: String,
    trigger_event: Option<serde_json::Value>,
    db: Arc<dyn Database>,
) -> Result<()> {
    let timeout_in_seconds = WORKFLOW_RUN_TIMEOUT_IN_SECONDS.get().await.clone();
    let context = Context::init(
        workflow_id.clone(),
        timeout_in_seconds,
        db.clone(),
        Arc::new(ReqwestClient::new()),
    )
    .await?;

    let mut workflow = match Workflow::load_from_db(&workflow_id, db.borrow()).await {
        Ok(workflow) => workflow,
        Err(e) => {
            tracing::error!("Failed to start workflow {workflow_id}. {e}");
            let error_message = format!("Failed to start workflow. {e}");
            db.store_workflow_run_error(&context.run_id, &error_message)
                .await?;
            return Err(e);
        }
    };

    // check that start_action_id exists and is a start workflow node
    match workflow.actions.get(&start_action_id) {
        None => {
            let error_message = format!("Failed to start workflow {workflow_id} because action with id {start_action_id} does not exist.");
            tracing::error!(error_message);
            db.store_workflow_run_error(&context.run_id, &error_message)
                .await?;
            return Ok(());
        }
        Some(action) => {
            if !action.node.is_start_node() {
                let error_message = format!("Failed to start workflow {workflow_id} because action with id {start_action_id} is not a start node.");
                tracing::error!(error_message);
                db.store_workflow_run_error(&context.run_id, &error_message)
                    .await?;
                return Ok(());
            }
        }
    };

    // check that workflow is live
    if !workflow.is_live {
        let error_message =
            format!("Failed to start workflow {workflow_id} because it is offline.");
        tracing::error!(error_message);
        db.store_workflow_run_error(&context.run_id, &error_message)
            .await?;
        return Ok(());
    }

    // if a trigger event exists, inject trigger event into start workflow node (webhook, manual start)
    if let Some(initial_event) = trigger_event {
        let action = workflow
            .actions
            .get_mut(&start_action_id)
            .expect("Start node reference handle does not exist!");
        if let ActionNode::Webhook(webhook_action) = &mut action.node {
            webhook_action.set_input(initial_event);
        } else if let ActionNode::ManualStart(manual_start_action) = &mut action.node {
            manual_start_action.set_input(initial_event);
        } else {
            // TODO: enable starting workflows from arbitrary nodes
            tracing::error!("Trying to run workflow {workflow_id} from non-start workflow node (not a webhook or manual start) with initial data!");
            return Err(anyhow!(
                "Trying to run workflow from non-start workflow action type (not a webhook or manual start) with initial data!"
            ));
        }
    }

    let run_id = context.run_id.clone();

    let mut executor = WorkflowExecutor::init(context, workflow, start_action_id);

    if let Err(e) = executor.execute().await {
        tracing::error!("Internal error - Failed to execute workflow \"{workflow_id}\" on run \"{run_id}\": {e}");
        let error_message = format!("Internal error - failed to execute workflow. Please contact support. Workflow Id: \"{workflow_id}\", Run Id: \"{run_id}\"");
        db.store_workflow_run_error(&run_id, &error_message).await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_edge_type_parsing() {
        let s = "DEFAULT".to_string();
        assert_eq!(EdgeType::Default, EdgeType::from_str(&s).unwrap());
    }
}
