mod ai_action;
mod context;
mod execution_state;
pub mod executor;
mod http_request_action;
mod if_condition_action;
mod reference_resolution;
mod send_email_action;
mod webhook_action;

use self::executor::WorkflowExecutor;
use crate::postgres::fetch_workflow_data;
use anyhow::{anyhow, Result};
use enum_dispatch::enum_dispatch;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use std::borrow::Borrow;
use std::collections::HashMap;
use std::sync::Arc;

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
    async fn execute(&self, context: &context::Context) -> Result<Option<serde_json::Value>>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[enum_dispatch(ActionExecutor)]
pub enum ActionNode {
    Webhook(webhook_action::Webhook),
    HttpRequest(http_request_action::HttpRequest),
    IfCondition(if_condition_action::IfCondition),
    AiAction(ai_action::AiAction),
    SendEmail(send_email_action::SendEmail),
}

impl ActionNode {
    fn from(action_type: &str, action_definition: serde_json::Value) -> Result<Self> {
        match action_type {
            "WEBHOOK" => Ok(Self::Webhook(webhook_action::Webhook)),
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
    let workflow = Workflow::load_from_db(&workflow_id, pg_pool.borrow()).await?;

    if !workflow.is_live {
        // Workflow is offline
        return Ok(());
    }

    let mut executor = match trigger_event {
        Some(event) => {
            WorkflowExecutor::init_with_initial_payload(
                pg_pool,
                workflow,
                start_node_reference_handle,
                event,
            )
            .await?
        }
        None => WorkflowExecutor::init(pg_pool, workflow, start_node_reference_handle).await?,
    };
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
