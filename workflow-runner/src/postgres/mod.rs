mod crypto;

use anyhow::{anyhow, Result};
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, types::Uuid, Pool, Postgres};
use std::sync::Arc;
use time::OffsetDateTime;

// TODO: wrap everything in a trait and implement a struct PostgresDbConnection (trait required for mocking)

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
    pub workflow_id: String,
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
    tracing::info!("Fetching workflow data - workflow_id = {workflow_id}");

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
        r#"SELECT action_id, workflow_id, action_name, reference_handle, action_definition FROM actions WHERE workflow_id = $1"#,
        workflow_uuid
    ).fetch_all(pool).await?;

    let workflow_edges: Vec<WorkflowEdgeRow> = sqlx::query_as!(
        WorkflowEdgeRow,
        r#"SELECT parent_reference_handle, child_reference_handle FROM workflow_edges WHERE workflow_id = $1"#,
        workflow_uuid
    ).fetch_all(pool).await?;

    tracing::info!("Finished fetching workflow data - workflow_id = {workflow_id}");

    Ok((workflow_row, actions, workflow_edges))
}

#[derive(sqlx::FromRow, Debug)]
struct RunStateRow {
    run_id: String,
}

pub async fn init_run_state(pool: &Pool<Postgres>, workflow_id: &str) -> Result<String> {
    tracing::info!("Initializing run state - workflow_id = {workflow_id}");

    let workflow_uuid = str_to_uuid(workflow_id)?;

    let run_state: RunStateRow = sqlx::query_as!(
        RunStateRow,
        r#"INSERT INTO workflow_run_states ( workflow_id, run_state ) VALUES ( $1, $2 ) RETURNING run_id"#,
        workflow_uuid,
        json!({})
    )
    .fetch_one(pool)
    .await?;

    tracing::info!("Finished initializing run state - workflow_id = {workflow_id}");

    Ok(run_state.run_id)
}

/// Assumption: run state for workflow_id exists
pub async fn update_run_state(
    pool: &Pool<Postgres>,
    run_id: &str,
    run_state: serde_json::Value,
) -> Result<()> {
    tracing::info!("Updating run state - run_id = {run_id}");

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

    tracing::info!("Finished updating run state - run_id = {run_id}");

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
    tracing::info!("Marking run state as completed - run_id = {run_id}");

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

    tracing::info!("Finished marking run state as completed - run_id = {run_id}");

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
    tracing::info!("Fetching webhook - webhook_id = {webhook_id}");

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

    tracing::info!("Finished fetching webhook - webhook_id = {webhook_id}");

    Ok(webhook)
}

#[derive(sqlx::FromRow, Debug)]
struct WebhookSecret {
    webhook_secret: String,
}

pub async fn fetch_webhook_secret(
    pool: &Pool<Postgres>,
    webhook_id: &str,
) -> Result<Option<String>> {
    tracing::info!("Fetching webhook secret - webhook_id = {webhook_id}");

    let webhook_uuid = str_to_uuid(webhook_id)?;

    let webhook: Option<WebhookSecret> = sqlx::query_as!(
        WebhookSecret,
        r#"SELECT webhook_secret FROM webhooks WHERE webhook_id = $1"#,
        webhook_uuid
    )
    .fetch_optional(pool)
    .await?;

    tracing::info!("Finished fetching webhook secret - webhook_id = {webhook_id}");

    Ok(webhook.map(|webhook| webhook.webhook_secret))
}

#[derive(sqlx::FromRow, Debug)]
struct UserValidation {
    pub email_confirmed_at: Option<OffsetDateTime>,
    pub deleted_at: Option<OffsetDateTime>,
}

pub async fn is_user_valid(pool: &Pool<Postgres>, user_id: &str) -> Result<bool> {
    tracing::info!("Validating user - user_id = {user_id}");

    // We perform the following checks:
    // 1) Does the user exist?
    // 2) Did the user confirm her/his email?
    // 3) Was the user deleted?
    let user_uuid = str_to_uuid(user_id)?;

    let user: Option<UserValidation> = sqlx::query_as!(
        UserValidation,
        r#"
        SELECT email_confirmed_at, deleted_at
        FROM auth.users
        WHERE id = $1
        "#,
        user_uuid
    )
    .fetch_optional(pool)
    .await?;

    let is_valid = match user {
        None => false,
        Some(user) => user.deleted_at.is_none() && user.email_confirmed_at.is_some(),
    };

    tracing::info!("Finished validating user - user_id = {user_id}");

    Ok(is_valid)
}

pub async fn fetch_action(pool: &Pool<Postgres>, action_id: &str) -> Result<Option<ActionRow>> {
    tracing::info!("Fetching action - action_id = {action_id}");

    let action_uuid = str_to_uuid(action_id)?;

    let action: Option<ActionRow> = sqlx::query_as!(
        ActionRow,
        r#"SELECT action_id, workflow_id, action_name, reference_handle, action_definition FROM actions WHERE action_id = $1"#,
        action_uuid
    )
    .fetch_optional(pool)
    .await?;

    tracing::info!("Finished fetching action - action_id = {action_id}");

    Ok(action)
}

#[derive(sqlx::FromRow, Debug)]
struct CredentialRow {
    encrypted_secret: String,
}

pub async fn fetch_secret(
    pool: &Pool<Postgres>,
    workflow_id: &str,
    credential_name: &str,
) -> Result<Option<String>> {
    tracing::info!(
        "Fetching secret - worklow_id = {workflow_id}, credential_name = {credential_name}"
    );

    let workflow_uuid = str_to_uuid(workflow_id)?;

    let credential: Option<CredentialRow> = sqlx::query_as!(
        CredentialRow,
        r#"SELECT c.encrypted_secret FROM workflows w JOIN credentials c ON w.user_id = c.user_id WHERE c.credential_name = $1 AND w.workflow_id = $2"#,
        credential_name,
        workflow_uuid
     )
     .fetch_optional(pool)
     .await?;

    tracing::info!("Finished fetching secret - workflow_id = {workflow_id}, credential_name = {credential_name}");

    match credential {
        None => Ok(None),
        Some(credential) => {
            let decrypted_secret = crypto::decrypt_aes256_gcm(&credential.encrypted_secret).await?;
            Ok(Some(decrypted_secret))
        }
    }
}
