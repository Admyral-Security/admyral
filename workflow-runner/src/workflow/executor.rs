use crate::workflow::EdgeType;

use super::{context::Context, ActionExecutor, ReferenceHandle, Workflow};
use anyhow::Result;
use serde_json::json;
use sqlx::{Pool, Postgres};
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug, Clone)]
struct QueueElement {
    reference_handle: ReferenceHandle,
    prev_action_state_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct WorkflowExecutor {
    workflow: Workflow,
    context: Context,
    start_node_reference_handle: ReferenceHandle,
}

impl WorkflowExecutor {
    pub async fn init(
        pg_pool: Arc<Pool<Postgres>>,
        workflow: Workflow,
        start_node_reference_handle: ReferenceHandle,
        execution_time_limit_in_sec: Option<u64>,
    ) -> Result<Self> {
        let context = Context::init(
            workflow.workflow_id.clone(),
            execution_time_limit_in_sec,
            pg_pool,
        )
        .await?;
        Ok(Self {
            workflow,
            context,
            start_node_reference_handle,
        })
    }

    // TODO: if an error occurrs, we do not execute complete run
    pub async fn execute(&mut self) -> Result<()> {
        let start_time = Instant::now();

        let mut queue = VecDeque::new();
        queue.push_back(QueueElement {
            reference_handle: self.start_node_reference_handle.clone(),
            prev_action_state_id: None,
        });

        while !queue.is_empty() {
            let queue_element = queue.pop_front().unwrap();

            let action = self
                .workflow
                .actions
                .get(&queue_element.reference_handle)
                .expect("Failed to dereference reference handle!");

            if self.context.execution_time_limit_in_sec.is_some()
                && start_time.elapsed().as_secs()
                    >= self.context.execution_time_limit_in_sec.unwrap()
            {
                // Stop execution. Execution time was exceeded.
                tracing::info!(
                    "Workflow {} exceeded timeout limit of {}",
                    self.workflow.workflow_id,
                    self.context.execution_time_limit_in_sec.unwrap()
                );

                self.context
                    .persist_run_state(
                        &queue_element.reference_handle,
                        &action.id,
                        queue_element
                            .prev_action_state_id
                            .as_ref()
                            .map(|s| s.as_str()),
                        json!({"error": "Workflow time limit exceeded"}),
                        true,
                    )
                    .await?;

                break;
            }

            tracing::info!(
                "Executing action of type {} with action id {} of workflow {}",
                action.node.type_as_str(),
                action.id,
                self.workflow.workflow_id
            );

            let mut allowed_edge_type = EdgeType::Default;
            let output = match action.node.execute(&self.context).await {
                Ok(value) => value,
                Err(e) => {
                    tracing::error!(
                        "Error during execution of action {} for workflow {}: {e}",
                        action.name,
                        self.workflow.workflow_id,
                    );
                    // TODO: propagate good error messages for displaying to the user
                    self.context
                        .persist_run_state(
                            &queue_element.reference_handle,
                            &action.id,
                            queue_element
                                .prev_action_state_id
                                .as_ref()
                                .map(|s| s.as_str()),
                            json!({"error": format!("Failed to execute action {}", action.name)}),
                            true,
                        )
                        .await?;
                    break;
                }
            };

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

            let action_state_id = self
                .context
                .persist_run_state(
                    &queue_element.reference_handle,
                    &action.id,
                    queue_element
                        .prev_action_state_id
                        .as_ref()
                        .map(|s| s.as_str()),
                    output,
                    false,
                )
                .await?;

            if let Some(children) = self.workflow.adj_list.get(&queue_element.reference_handle) {
                for (next_action, next_edge_type) in children {
                    if *next_edge_type == allowed_edge_type {
                        queue.push_back(QueueElement {
                            reference_handle: next_action.clone(),
                            prev_action_state_id: Some(action_state_id.clone()),
                        });
                    }
                }
            }
        }

        self.context.complete_run().await
    }
}
