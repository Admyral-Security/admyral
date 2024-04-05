use crate::postgres::setup_postgres_pool;
use anyhow::Result;
use sqlx::{Pool, Postgres};
use std::sync::Arc;

#[derive(Debug)]
pub struct State {
    pub db_pool: Arc<Pool<Postgres>>,
}

pub type SharedState = Arc<State>;

pub async fn setup_state() -> Result<SharedState> {
    Ok(Arc::new(State {
        db_pool: setup_postgres_pool().await?,
    }))
}
