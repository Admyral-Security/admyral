use crate::postgres::{init_run_state, mark_run_state_as_completed, persist_action_run_state};
use anyhow::Result;
use sqlx::{Pool, Postgres};
use std::{borrow::Borrow, sync::Arc};

use super::{execution_state::ExecutionState, ReferenceHandle};

#[derive(Debug, Clone)]
pub struct Context {
    pub workflow_id: String,
    pub execution_state: ExecutionState,
    pub pg_pool: Arc<Pool<Postgres>>,
    run_id: String,
}

impl Context {
    pub async fn init(workflow_id: String, pg_pool: Arc<Pool<Postgres>>) -> Result<Self> {
        let run_id = init_run_state(pg_pool.borrow(), &workflow_id).await?;
        Ok(Self {
            workflow_id,
            execution_state: ExecutionState::default(),
            pg_pool,
            run_id,
        })
    }

    pub async fn persist_run_state(
        &mut self,
        reference_handle: &ReferenceHandle,
        action_id: &str,
        output: serde_json::Value,
    ) -> Result<()> {
        self.execution_state
            .store(reference_handle.clone(), output.clone());
        persist_action_run_state(self.pg_pool.borrow(), &self.run_id, action_id, output).await?;
        Ok(())
    }

    pub async fn complete_run(&self) -> Result<()> {
        mark_run_state_as_completed(self.pg_pool.borrow(), &self.run_id).await?;
        Ok(())
    }
}
