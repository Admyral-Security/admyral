mod context;
mod execution_state;
pub mod executor;
mod http_request_action;
mod reference_resolution;
mod webhook_action;

use self::executor::WorkflowExecutor;
use crate::postgres::fetch_workflow_data;
use anyhow::Result;
use enum_dispatch::enum_dispatch;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use std::borrow::Borrow;
use std::collections::HashMap;
use std::sync::Arc;

pub type ReferenceHandle = String;

#[enum_dispatch]
pub trait ActionExecutor {
    fn get_reference_handle(&self) -> &ReferenceHandle;

    async fn execute(&self, context: &mut context::Context) -> Result<Option<serde_json::Value>>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[enum_dispatch(ActionExecutor)]
#[serde(tag = "type", content = "payload")]
pub enum ActionNode {
    Webhook(webhook_action::Webhook),
    HttpRequest(http_request_action::HttpRequest),
}

#[derive(Debug, Clone)]
pub struct Action {
    pub id: String,
    pub name: String,
    pub node: ActionNode,
}

#[derive(Debug, Clone)]
pub struct Workflow {
    pub workflow_id: String,
    pub workflow_name: String,
    pub is_live: bool,
    pub adj_list: HashMap<ReferenceHandle, Vec<ReferenceHandle>>,
    pub actions: HashMap<ReferenceHandle, Action>,
}

impl Workflow {
    pub async fn load_from_db(workflow_id: &str, pool: &Pool<Postgres>) -> Result<Self> {
        let (workflow, actions, edges) = fetch_workflow_data(pool, workflow_id).await?;

        let actions = actions
            .into_iter()
            .map(|action_row| {
                (
                    action_row.reference_handle,
                    Action {
                        id: action_row.action_id,
                        name: action_row.action_name,
                        node: serde_json::from_value::<ActionNode>(action_row.action_definition)
                            .expect("ActionNode parsing went wrong"),
                    },
                )
            })
            .collect::<HashMap<ReferenceHandle, Action>>();

        let mut adj_list = HashMap::new();
        edges.into_iter().for_each(|edge_row| {
            adj_list
                .entry(edge_row.parent_reference_handle)
                .and_modify(|children: &mut Vec<ReferenceHandle>| {
                    children.push(edge_row.child_reference_handle.clone())
                })
                .or_insert_with(|| vec![edge_row.child_reference_handle]);
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
    initial_data: Option<serde_json::Value>,
    pg_pool: Arc<Pool<Postgres>>,
) -> Result<()> {
    let workflow = Workflow::load_from_db(&workflow_id, pg_pool.borrow()).await?;

    if !workflow.is_live {
        // Workflow is offline
        return Ok(());
    }

    let mut executor = match initial_data {
        Some(inital_data) => {
            WorkflowExecutor::init_with_initial_payload(
                pg_pool,
                workflow,
                start_node_reference_handle,
                inital_data,
            )
            .await?
        }
        None => WorkflowExecutor::init(pg_pool, workflow, start_node_reference_handle).await?,
    };
    executor.execute().await?;
    Ok(())
}
