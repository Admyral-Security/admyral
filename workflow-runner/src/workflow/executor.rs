use crate::workflow::EdgeType;

use super::{context::Context, ActionExecutor, ReferenceHandle, Workflow};
use anyhow::Result;
use sqlx::{Pool, Postgres};
use std::collections::VecDeque;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct WorkflowExecutor {
    workflow: Workflow,
    start_node_reference_handle: ReferenceHandle,
    context: Context,
}

impl WorkflowExecutor {
    pub async fn init(
        pg_pool: Arc<Pool<Postgres>>,
        workflow: Workflow,
        start_node_reference_handle: ReferenceHandle,
    ) -> Result<Self> {
        let context = Context::init(workflow.workflow_id.clone(), pg_pool).await?;
        Ok(Self {
            workflow,
            start_node_reference_handle,
            context,
        })
    }

    pub async fn init_with_initial_payload(
        pg_pool: Arc<Pool<Postgres>>,
        workflow: Workflow,
        start_node_reference_handle: String,
        inital_data: serde_json::Value,
    ) -> Result<Self> {
        let mut executor =
            Self::init(pg_pool, workflow, start_node_reference_handle.clone()).await?;
        // Store payload from webhook
        let start_node = executor
            .workflow
            .actions
            .get(&start_node_reference_handle)
            .expect("Invalid start node reference handle");

        executor
            .context
            .persist_run_state(&start_node_reference_handle, &start_node.id, inital_data)
            .await?;

        Ok(executor)
    }

    pub async fn execute(&mut self) -> Result<()> {
        let mut queue = VecDeque::new();
        queue.push_back(self.start_node_reference_handle.clone());

        while !queue.is_empty() {
            let action_reference_handle = queue.pop_front().unwrap();
            let action = self
                .workflow
                .actions
                .get(&action_reference_handle)
                .expect("Failed to dereference reference handle!");

            tracing::info!(
                "Executing action of type {} with action id {} of workflow {}",
                action.node.type_as_str(),
                action.id,
                self.workflow.workflow_id
            );

            let mut allowed_edge_type = EdgeType::Default;
            if let Some(output) = action.node.execute(&self.context).await? {
                // If the current action node is an if-condition, we must decide which
                // path the execution should follow.
                if action.node.is_if_condition() {
                    let condition_result = output
                        .as_object()
                        .expect("If-Condition action result must be an object!")
                        .get("condition_result")
                        .expect("If-Condition action result object must have key \"condition_result\"")
                        .as_bool()
                        .expect(
                            "If-Condition action result object with key \"condition_result\" must be bool",
                        );
                    allowed_edge_type = match condition_result {
                        true => EdgeType::True,
                        false => EdgeType::False,
                    };
                }

                self.context
                    .persist_run_state(&action_reference_handle, &action.id, output)
                    .await?;
            }

            if let Some(children) = self.workflow.adj_list.get(&action_reference_handle) {
                for (next_action, next_edge_type) in children {
                    if *next_edge_type == allowed_edge_type {
                        queue.push_back(next_action.clone());
                    }
                }
            }
        }

        self.context.complete_run().await
    }
}
