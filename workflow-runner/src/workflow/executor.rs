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
            .persist_run_state(&start_node.reference_handle, &start_node.id, inital_data)
            .await?;
        Ok(executor)
    }

    pub async fn execute(&mut self) -> Result<()> {
        let mut queue = VecDeque::new();
        queue.push_back(&self.start_node_reference_handle);

        while !queue.is_empty() {
            let action_reference_handle = queue.pop_front().unwrap();
            let action = self
                .workflow
                .actions
                .get(action_reference_handle)
                .expect("Failed to dereference reference handle!");

            tracing::info!(
                "Executing action of type {} with action id {} of workflow {}",
                action.node.type_as_str(),
                action.id,
                self.workflow.workflow_id
            );
            if let Some(output) = action.node.execute(&self.context).await? {
                self.context
                    .persist_run_state(&action.reference_handle, &action.id, output)
                    .await?;
            }

            if let Some(children) = self.workflow.adj_list.get(action_reference_handle) {
                for next_action in children {
                    queue.push_back(next_action);
                }
            }
        }

        self.context.complete_run().await
    }
}
