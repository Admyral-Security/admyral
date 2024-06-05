use crate::workflow::EdgeType;

use super::{context::Context, ActionExecutor, Workflow};
use anyhow::Result;
use serde_json::json;
use std::collections::VecDeque;
use std::time::Instant;

#[derive(Debug, Clone)]
struct QueueElement {
    action_id: String,
    prev_action_state_id: Option<String>,
}

#[derive(Clone)]
pub struct WorkflowExecutor {
    workflow: Workflow,
    context: Context,
    start_action_id: String,
}

impl WorkflowExecutor {
    pub fn init(context: Context, workflow: Workflow, start_action_id: String) -> Self {
        Self {
            workflow,
            context,
            start_action_id,
        }
    }

    pub async fn execute(&mut self) -> Result<()> {
        let start_time = Instant::now();

        let mut queue = VecDeque::new();
        queue.push_back(QueueElement {
            action_id: self.start_action_id.clone(),
            prev_action_state_id: None,
        });

        while !queue.is_empty() {
            let queue_element = queue.pop_front().unwrap();

            let action = self
                .workflow
                .actions
                .get(&queue_element.action_id)
                .expect("Failed to dereference reference handle!");

            // Stop execution if execution time limit is exceeded.
            if self.context.execution_time_limit_in_sec.is_some()
                && start_time.elapsed().as_secs()
                    >= self.context.execution_time_limit_in_sec.unwrap()
            {
                tracing::info!(
                    "Workflow {} exceeded timeout limit of {}",
                    self.workflow.workflow_id,
                    self.context.execution_time_limit_in_sec.unwrap()
                );

                self.context
                    .persist_run_state(
                        &action.reference_handle,
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
            // TODO: double-check all actions for useful error messages
            let output = match action.node.execute(&self.context).await {
                Ok(value) => value,
                Err(e) => {
                    tracing::error!(
                        "Error during execution of action {} for workflow {}: {e}",
                        action.name,
                        self.workflow.workflow_id,
                    );
                    json!({"error": format!("Failed to execute action {}: {e}", action.name)})
                }
            };

            // If the current action node is an if-condition, we must decide which
            // path the execution should follow.
            if action.node.is_if_condition() {
                // If the if-condition failed to execute, we can't choose an edge type.
                if let Some(condition_result_value) = output.get("condition_result") {
                    let condition_result = condition_result_value
                        .as_bool()
                        .expect("If-Condition action result object with key \"condition_result\" must be bool");
                    allowed_edge_type = match condition_result {
                        true => EdgeType::True,
                        false => EdgeType::False,
                    };
                }
            }

            let action_state_id = self
                .context
                .persist_run_state(
                    &action.reference_handle,
                    &action.id,
                    queue_element
                        .prev_action_state_id
                        .as_ref()
                        .map(|s| s.as_str()),
                    output,
                    false,
                )
                .await?;

            if let Some(children) = self.workflow.adj_list.get(&action.id) {
                for (next_action_id, next_edge_type) in children {
                    if *next_edge_type == allowed_edge_type {
                        queue.push_back(QueueElement {
                            action_id: next_action_id.clone(),
                            prev_action_state_id: Some(action_state_id.clone()),
                        });
                    }
                }
            }
        }

        self.context.complete_run().await
    }
}
