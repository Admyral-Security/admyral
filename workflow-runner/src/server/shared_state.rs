use crate::postgres::{setup_postgres_pool, PostgresDatabase};
use anyhow::Result;
use std::sync::Arc;

#[derive(Debug)]
pub struct State {
    pub db: Arc<PostgresDatabase>,
}

pub type SharedState = Arc<State>;

pub async fn setup_state() -> Result<SharedState> {
    Ok(Arc::new(State {
        db: setup_postgres_pool().await?,
    }))
}
