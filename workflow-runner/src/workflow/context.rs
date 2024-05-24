use crate::postgres::Database;
use anyhow::Result;
use std::sync::Arc;

use super::{execution_state::ExecutionState, ReferenceHandle};

#[derive(Clone)]
pub struct Context {
    pub workflow_id: String,
    pub execution_state: ExecutionState,
    pub db: Arc<dyn Database>,
    pub run_id: String,
    pub execution_time_limit_in_sec: Option<u64>,
}

impl Context {
    pub async fn init(
        workflow_id: String,
        execution_time_limit_in_sec: Option<u64>,
        db: Arc<dyn Database>,
    ) -> Result<Self> {
        let run_id = db.init_run_state(&workflow_id).await?;
        Ok(Self {
            workflow_id,
            execution_state: ExecutionState::default(),
            db,
            run_id,
            execution_time_limit_in_sec,
        })
    }

    pub async fn persist_run_state(
        &mut self,
        reference_handle: &ReferenceHandle,
        action_id: &str,
        prev_action_state_id: Option<&str>,
        output: serde_json::Value,
        is_error: bool,
    ) -> Result<String> {
        self.execution_state
            .store(reference_handle.clone(), output.clone());
        let action_state_id = self
            .db
            .persist_action_run_state(
                &self.run_id,
                action_id,
                prev_action_state_id,
                output,
                is_error,
            )
            .await?;
        Ok(action_state_id)
    }

    pub async fn complete_run(&self) -> Result<()> {
        self.db.mark_run_state_as_completed(&self.run_id).await?;
        Ok(())
    }
}
