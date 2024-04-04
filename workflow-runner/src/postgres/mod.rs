use anyhow::{anyhow, Result};
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, types::Uuid, Pool, Postgres};
use std::sync::Arc;

pub async fn setup_postgres_pool() -> Result<Arc<Pool<Postgres>>> {
    let pool = PgPoolOptions::new()
        .max_connections(
            std::env::var("DATABASE_CONNECTION_POOL_SIZE")
                .expect("Missing environment variable DATABASE_CONNECTION_POOL_SIZE")
                .parse::<u32>()
                .expect("Non-numeirc environment variable DATABASE_CONNECTION_POOL_SIZE"),
        )
        .connect(&std::env::var("DATABASE_URL").expect("Missing environment variable DATABASE_URL"))
        .await?;

    Ok(Arc::new(pool))
}

fn str_to_uuid(s: &str) -> Result<Uuid> {
    Uuid::parse_str(s).map_err(|e| anyhow!(e))
}

#[derive(sqlx::FromRow, Debug)]
pub struct WorkflowRow {
    pub workflow_id: String,
    pub workflow_name: String,
    pub is_live: bool,
}

#[derive(sqlx::FromRow, Debug)]
pub struct ActionRow {
    pub action_id: String,
    pub action_name: String,
    pub reference_handle: String,
    pub action_definition: serde_json::Value,
}

#[derive(sqlx::FromRow, Debug)]
pub struct WorkflowEdgeRow {
    pub parent_reference_handle: String,
    pub child_reference_handle: String,
}

pub async fn fetch_workflow_data(
    pool: &Pool<Postgres>,
    workflow_id: &str,
) -> Result<(WorkflowRow, Vec<ActionRow>, Vec<WorkflowEdgeRow>)> {
    let workflow_uuid = str_to_uuid(workflow_id)?;

    let workflow_row: WorkflowRow = sqlx::query_as!(
        WorkflowRow,
        r#"SELECT workflow_id, workflow_name, is_live FROM workflows WHERE workflow_id = $1 LIMIT 1"#,
        workflow_uuid
    )
    .fetch_one(pool)
    .await?;

    let actions: Vec<ActionRow> = sqlx::query_as!(
        ActionRow,
        r#"SELECT action_id, action_name, reference_handle, action_definition FROM actions WHERE workflow_id = $1"#,
        workflow_uuid
    ).fetch_all(pool).await?;

    let workflow_edges: Vec<WorkflowEdgeRow> = sqlx::query_as!(
        WorkflowEdgeRow,
        r#"SELECT parent_reference_handle, child_reference_handle FROM workflow_edges WHERE workflow_id = $1"#,
        workflow_uuid
    ).fetch_all(pool).await?;

    Ok((workflow_row, actions, workflow_edges))
}

#[derive(sqlx::FromRow, Debug)]
struct RunStateRow {
    run_id: String,
}

pub async fn init_run_state(pool: &Pool<Postgres>, workflow_id: &str) -> Result<String> {
    let workflow_uuid = str_to_uuid(workflow_id)?;

    let run_state: RunStateRow = sqlx::query_as!(
        RunStateRow,
        r#"INSERT INTO workflow_run_states ( workflow_id, run_state ) VALUES ( $1, $2 ) RETURNING run_id"#,
        workflow_uuid,
        json!({})
    )
    .fetch_one(pool)
    .await?;

    Ok(run_state.run_id)
}

/// Assumption: run state for workflow_id exists
pub async fn update_run_state(
    pool: &Pool<Postgres>,
    run_id: &str,
    run_state: serde_json::Value,
) -> Result<()> {
    let run_uuid = str_to_uuid(run_id)?;

    let rows_affected = sqlx::query!(
        r#"
        UPDATE workflow_run_states
        SET last_updated_timestamp = CURRENT_TIMESTAMP,
            run_state = $1
        WHERE run_id = $2
        "#,
        run_state,
        run_uuid
    )
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected == 1 {
        Ok(())
    } else {
        // this should not happen!
        Err(anyhow!(
            "Trying to update workflow run state for run id {} without initializing it first!",
            run_id
        ))
    }
}

pub async fn mark_run_state_as_completed(pool: &Pool<Postgres>, run_id: &str) -> Result<()> {
    let run_uuid = str_to_uuid(run_id)?;

    let rows_affected = sqlx::query!(
        r#"
        UPDATE workflow_run_states
        SET completed_timestamp = CURRENT_TIMESTAMP
        WHERE run_id = $1
        "#,
        run_uuid
    )
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected == 1 {
        Ok(())
    } else {
        // this should not happen!
        Err(anyhow!(
            "Trying to mark workflow run state as complete for run id {} without initializing it first!",
            run_id
        ))
    }
}

#[derive(sqlx::FromRow, Debug)]
pub struct WebhookRow {
    pub webhook_id: String,
    pub reference_handle: String,
    pub workflow_id: String,
}

pub async fn fetch_webhook(pool: &Pool<Postgres>, webhook_id: &str) -> Result<Option<WebhookRow>> {
    let webhook_uuid = str_to_uuid(webhook_id)?;

    let webhook: Option<WebhookRow> = sqlx::query_as!(
        WebhookRow,
        r#"
        SELECT webhook_id, a.reference_handle, workflow_id
        FROM webhooks w
        JOIN actions a ON w.action_id = a.action_id
        WHERE w.webhook_id = $1
        LIMIT 1
        "#,
        webhook_uuid
    )
    .fetch_optional(pool)
    .await?;

    Ok(webhook)
}
