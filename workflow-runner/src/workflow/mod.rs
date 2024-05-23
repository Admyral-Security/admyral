mod ai_action;
mod context;
mod execution_state;
pub mod executor;
mod http_request_action;
mod if_condition_action;
mod integration_action;
mod manual_start_action;
mod reference_resolution;
mod send_email_action;
mod webhook_action;
mod http_client;

use self::executor::WorkflowExecutor;
use crate::postgres::fetch_workflow_data;
use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use enum_dispatch::enum_dispatch;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
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
    fn from(action_type: &str, action_definition: serde_json::Value) -> Result<Self> {
        match action_type {
            "WEBHOOK" => Ok(Self::Webhook(webhook_action::Webhook::default())),
            "HTTP_REQUEST" => Ok(Self::HttpRequest(serde_json::from_value::<
                http_request_action::HttpRequest,
            >(action_definition)?)),
            "IF_CONDITION" => Ok(Self::IfCondition(serde_json::from_value::<
                if_condition_action::IfCondition,
            >(action_definition)?)),
            "AI_ACTION" => Ok(Self::AiAction(
                serde_json::from_value::<ai_action::AiAction>(action_definition)?,
            )),
            "SEND_EMAIL" => Ok(Self::SendEmail(serde_json::from_value::<
                send_email_action::SendEmail,
            >(action_definition)?)),
            "MANUAL_START" => Ok(Self::ManualStart(
                manual_start_action::ManualStart::default(),
            )),
            "INTEGRATION" => Ok(Self::Integration(serde_json::from_value::<
                integration_action::Integration,
            >(action_definition)?)),
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
    pub adj_list: HashMap<ReferenceHandle, Vec<(ReferenceHandle, EdgeType)>>,
    pub actions: HashMap<ReferenceHandle, Action>,
}

impl Workflow {
    pub async fn load_from_db(workflow_id: &str, pool: &Pool<Postgres>) -> Result<Self> {
        let (workflow, actions, edges) = fetch_workflow_data(pool, workflow_id).await?;

        let actions = actions
            .into_iter()
            .map(|action_row| {
                (
                    action_row.reference_handle.clone(),
                    Action {
                        id: action_row.action_id,
                        name: action_row.action_name,
                        reference_handle: action_row.reference_handle,
                        node: ActionNode::from(
                            &action_row.action_type,
                            action_row.action_definition,
                        )
                        .expect("ActionNode parsing went wrong"),
                    },
                )
            })
            .collect::<HashMap<ReferenceHandle, Action>>();

        let mut adj_list = HashMap::new();
        edges.into_iter().for_each(|edge_row| {
            let edge_type = EdgeType::from_str(&edge_row.edge_type).expect("Illegal edge type!");

            adj_list
                .entry(edge_row.parent_reference_handle)
                .and_modify(|children: &mut Vec<(ReferenceHandle, EdgeType)>| {
                    children.push((edge_row.child_reference_handle.clone(), edge_type))
                })
                .or_insert_with(|| vec![(edge_row.child_reference_handle, edge_type)]);
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
    start_node_reference_handle: String,
    trigger_event: Option<serde_json::Value>,
    pg_pool: Arc<Pool<Postgres>>,
) -> Result<()> {
    let mut workflow = Workflow::load_from_db(&workflow_id, pg_pool.borrow()).await?;

    if !workflow.is_live {
        // Workflow is offline
        tracing::info!("Workflow {workflow_id} could not be executed because it is offline.");
        return Ok(());
    }

    // if a trigger event exists, inject trigger event into start workflow node (webhook, manual start)
    if let Some(initial_event) = trigger_event {
        let action = workflow
            .actions
            .get_mut(&start_node_reference_handle)
            .expect("Start node reference handle does not exist!");
        if let ActionNode::Webhook(webhook_action) = &mut action.node {
            webhook_action.set_input(initial_event);
        } else if let ActionNode::ManualStart(manual_start_action) = &mut action.node {
            manual_start_action.set_input(initial_event);
        } else {
            tracing::error!("Trying to run workflow {workflow_id} from non-start workflow node (not a webhook or manual start) with initial data!");
            return Err(anyhow!(
                "Trying to run workflow from non-start workflow action type (not a webhook or manual start) with initial data!"
            ));
        }
    }

    let timeout_in_seconds = WORKFLOW_RUN_TIMEOUT_IN_SECONDS.get().await.clone();

    let mut executor = WorkflowExecutor::init(
        pg_pool,
        workflow,
        start_node_reference_handle,
        timeout_in_seconds,
    )
    .await?;
    executor.execute().await?;
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
