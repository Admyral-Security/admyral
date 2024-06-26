mod crypto;

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use sqlx::{postgres::PgPoolOptions, types::Uuid, Pool, Postgres};
use std::fmt::Debug;
use std::sync::Arc;

// TODO: wrap everything in a trait and implement a struct PostgresDbConnection (trait required for mocking)

pub async fn setup_postgres_pool() -> Result<Arc<PostgresDatabase>> {
    let pool = PgPoolOptions::new()
        .max_connections(
            std::env::var("DATABASE_CONNECTION_POOL_SIZE")
                .expect("Missing environment variable DATABASE_CONNECTION_POOL_SIZE")
                .parse::<u32>()
                .expect("Non-numeirc environment variable DATABASE_CONNECTION_POOL_SIZE"),
        )
        .connect(&std::env::var("DATABASE_URL").expect("Missing environment variable DATABASE_URL"))
        .await?;

    Ok(Arc::new(PostgresDatabase { pg_pool: pool }))
}

fn str_to_uuid(s: &str) -> Result<Uuid> {
    Uuid::parse_str(s).map_err(|e| anyhow!(e))
}

#[derive(sqlx::FromRow, Debug, Default)]
pub struct WorkflowRow {
    pub workflow_id: String,
    pub workflow_name: String,
    pub is_live: bool,
}

#[derive(sqlx::FromRow, Debug, Default)]
pub struct ActionRow {
    pub action_id: String,
    pub workflow_id: String,
    pub action_name: String,
    pub reference_handle: String,
    pub action_type: String,
    pub action_definition: serde_json::Value,
}

#[derive(sqlx::FromRow, Debug, Default)]
pub struct WorkflowEdgeRow {
    pub parent_action_id: String,
    pub child_action_id: String,
    pub edge_type: String,
}

#[derive(sqlx::FromRow, Debug)]
struct RunStateRow {
    run_id: String,
}

#[derive(sqlx::FromRow, Debug)]
struct WorkflowRunActionStateRow {
    action_state_id: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct WebhookRow {
    pub webhook_id: String,
    pub action_id: String,
    pub workflow_id: String,
}

#[derive(sqlx::FromRow, Debug)]
struct WebhookSecret {
    webhook_secret: Option<String>,
}

#[derive(sqlx::FromRow, Debug)]
struct UserValidation {
    pub user_id: String,
}

#[derive(sqlx::FromRow, Debug)]
struct WorkflowValidation {
    pub workflow_id: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct Credential {
    pub secret: String,
    pub credential_type: Option<String>,
}

#[derive(sqlx::FromRow, Debug)]
struct WorkflowOwner {
    user_id: String,
}

#[derive(sqlx::FromRow, Debug)]
struct WorkflowRunAggregation {
    count: i64,
}

#[async_trait]
pub trait Database: Send + Sync {
    async fn fetch_workflow_data(
        &self,
        _workflow_id: &str,
    ) -> Result<(WorkflowRow, Vec<ActionRow>, Vec<WorkflowEdgeRow>)> {
        Ok((WorkflowRow::default(), Vec::new(), Vec::new()))
    }

    async fn init_run_state(&self, _workflow_id: &str) -> Result<String> {
        Ok("93d08575-2bbe-4811-ac3e-75305fcd5fd5".to_string())
    }

    async fn store_workflow_run_error(&self, _run_id: &str, _error: &str) -> Result<()> {
        Ok(())
    }

    async fn persist_action_run_state(
        &self,
        _run_id: &str,
        _action_id: &str,
        _prev_action_state_id: Option<&str>,
        _action_state: serde_json::Value,
        _is_error: bool,
    ) -> Result<String> {
        Ok(String::new())
    }

    async fn mark_run_state_as_completed(&self, _run_id: &str) -> Result<()> {
        Ok(())
    }

    async fn fetch_webhook(&self, _webhook_id: &str) -> Result<Option<WebhookRow>> {
        Ok(None)
    }

    async fn fetch_webhook_secret(&self, _webhook_id: &str) -> Result<Option<String>> {
        Ok(None)
    }

    async fn is_user_valid(&self, _user_id: &str) -> Result<bool> {
        Ok(true)
    }

    async fn is_workflow_owned_by_user(&self, _user_id: &str, _workflow_id: &str) -> Result<bool> {
        Ok(true)
    }

    async fn fetch_action(
        &self,
        _workflow_id: &str,
        _action_id: &str,
    ) -> Result<Option<ActionRow>> {
        Ok(None)
    }

    async fn fetch_secret(
        &self,
        workflow_id: &str,
        credential_name: &str,
    ) -> Result<Option<Credential>> {
        Ok(None)
    }

    async fn update_secret(
        &self,
        workflow_id: &str,
        credential_name: &str,
        secret: &str,
    ) -> Result<()> {
        Ok(())
    }

    async fn get_workflow_owner(&self, _workflow_id: &str) -> Result<String> {
        Ok(String::new())
    }

    async fn count_workflow_runs_of_account_last_hour(&self, _user_id: &str) -> Result<i64> {
        Ok(0)
    }
}

#[derive(Debug, Clone)]
pub struct PostgresDatabase {
    pg_pool: Pool<Postgres>,
}

#[async_trait]
impl Database for PostgresDatabase {
    async fn fetch_workflow_data(
        &self,
        workflow_id: &str,
    ) -> Result<(WorkflowRow, Vec<ActionRow>, Vec<WorkflowEdgeRow>)> {
        tracing::info!("Fetching workflow data - workflow_id = {workflow_id}");

        let workflow_uuid = str_to_uuid(workflow_id)?;

        let workflow_row: WorkflowRow = sqlx::query_as!(
            WorkflowRow,
            r#"
            SELECT workflow_id, workflow_name, is_live
            FROM admyral.workflow
            WHERE workflow_id = $1 AND is_template = false AND user_id IS NOT NULL
            LIMIT 1
            "#,
            workflow_uuid
        )
        .fetch_one(&self.pg_pool)
        .await?;

        let actions: Vec<ActionRow> = sqlx::query_as!(
            ActionRow,
            r#"
            SELECT action_id, workflow_id, action_name, reference_handle, action_type::text as "action_type!: String", action_definition
            FROM admyral.action_node
            WHERE workflow_id = $1 AND action_type <> 'NOTE'::admyral.actiontype
            "#,
            workflow_uuid
        )
        .fetch_all(&self.pg_pool)
        .await?;

        let workflow_edges: Vec<WorkflowEdgeRow> = sqlx::query_as!(
            WorkflowEdgeRow,
            r#"
            SELECT parent.action_id as parent_action_id, child.action_id as child_action_id, we.edge_type::TEXT as "edge_type!: String"
            FROM admyral.workflow_edge we
            JOIN admyral.action_node parent ON parent.action_id = we.parent_action_id
            JOIN admyral.action_node child ON child.action_id = we.child_action_id
            JOIN admyral.workflow w ON w.workflow_id = parent.workflow_id AND w.workflow_id = child.workflow_id
            WHERE w.workflow_id = $1
            "#,
            workflow_uuid
        )
        .fetch_all(&self.pg_pool)
        .await?;

        tracing::info!("Finished fetching workflow data - workflow_id = {workflow_id}");

        Ok((workflow_row, actions, workflow_edges))
    }

    async fn init_run_state(&self, workflow_id: &str) -> Result<String> {
        tracing::info!("Initializing run state - workflow_id = {workflow_id}");

        let workflow_uuid = str_to_uuid(workflow_id)?;

        let run_state: RunStateRow = sqlx::query_as!(
            RunStateRow,
            r#"
            INSERT INTO admyral.workflow_run ( workflow_id )
            VALUES ( $1 )
            RETURNING run_id
            "#,
            workflow_uuid
        )
        .fetch_one(&self.pg_pool)
        .await?;

        tracing::info!("Finished initializing run state - workflow_id = {workflow_id}");

        Ok(run_state.run_id)
    }

    async fn store_workflow_run_error(&self, run_id: &str, error: &str) -> Result<()> {
        tracing::info!("Storing workflow run error - run_id = {run_id}, error = {error}");

        let run_uuid = str_to_uuid(run_id)?;

        let rows_affected = sqlx::query!(
            r#"
            UPDATE admyral.workflow_run
            SET error = $1
            WHERE run_id = $2
            "#,
            error,
            run_uuid
        )
        .execute(&self.pg_pool)
        .await?
        .rows_affected();

        if rows_affected == 1 {
            tracing::info!("Finished storing workflow run error - run_id = {run_id}");
            Ok(())
        } else {
            // this should not happen!
            let error_message = format!("Failed to store workflow run error - run_id {run_id}");
            tracing::error!(error_message);
            Err(anyhow!(error_message))
        }
    }

    async fn persist_action_run_state(
        &self,
        run_id: &str,
        action_id: &str,
        prev_action_state_id: Option<&str>,
        action_state: serde_json::Value,
        is_error: bool,
    ) -> Result<String> {
        tracing::info!("Persisting action run state - run_id = {run_id}, action_id = {action_id}");

        let run_uuid = str_to_uuid(run_id)?;
        let action_uuid = str_to_uuid(action_id)?;
        let prev_action_state_uuid = match prev_action_state_id {
            None => None,
            Some(id) => Some(str_to_uuid(id)?),
        };

        let row: WorkflowRunActionStateRow = sqlx::query_as!(
            WorkflowRunActionStateRow,
            r#"
            INSERT INTO admyral.workflow_run_action_state ( action_state, run_id, action_id, is_error, prev_action_state_id)
            VALUES ( $1, $2, $3, $4, $5 )
            RETURNING action_state_id
            "#,
            action_state,
            run_uuid,
            action_uuid,
            is_error,
            prev_action_state_uuid
        )
        .fetch_one(&self.pg_pool)
        .await?;

        tracing::info!(
            "Finished persisting action run state - run_id = {run_id}, action_id = {action_id}"
        );

        Ok(row.action_state_id)
    }

    async fn mark_run_state_as_completed(&self, run_id: &str) -> Result<()> {
        tracing::info!("Marking run state as completed - run_id = {run_id}");

        let run_uuid = str_to_uuid(run_id)?;

        let rows_affected = sqlx::query!(
            r#"
            UPDATE admyral.workflow_run
            SET completed_timestamp = CURRENT_TIMESTAMP
            WHERE run_id = $1
            "#,
            run_uuid
        )
        .execute(&self.pg_pool)
        .await?
        .rows_affected();

        let result = if rows_affected == 1 {
            Ok(())
        } else {
            // this should not happen!
            Err(anyhow!(
                "Trying to mark workflow run state as complete for run id {} without initializing it first!",
                run_id
            ))
        };

        tracing::info!("Finished marking run state as completed - run_id = {run_id}");

        result
    }

    async fn fetch_webhook(&self, webhook_id: &str) -> Result<Option<WebhookRow>> {
        tracing::info!("Fetching webhook - webhook_id = {webhook_id}");

        let webhook_uuid = str_to_uuid(webhook_id)?;

        let webhook: Option<WebhookRow> = sqlx::query_as!(
            WebhookRow,
            r#"
            SELECT w.webhook_id, a.action_id, a.workflow_id
            FROM admyral.webhook w
            JOIN admyral.action_node a ON w.action_id = a.action_id
            WHERE w.webhook_id = $1
            LIMIT 1
            "#,
            webhook_uuid
        )
        .fetch_optional(&self.pg_pool)
        .await?;

        tracing::info!("Finished fetching webhook - webhook_id = {webhook_id}");

        Ok(webhook)
    }

    async fn fetch_webhook_secret(&self, webhook_id: &str) -> Result<Option<String>> {
        tracing::info!("Fetching webhook secret - webhook_id = {webhook_id}");

        let webhook_uuid = str_to_uuid(webhook_id)?;

        let webhook: Option<WebhookSecret> = sqlx::query_as!(
            WebhookSecret,
            r#"SELECT webhook_secret FROM admyral.webhook WHERE webhook_id = $1 LIMIT 1"#,
            webhook_uuid
        )
        .fetch_optional(&self.pg_pool)
        .await?;

        tracing::info!("Finished fetching webhook secret - webhook_id = {webhook_id}");

        Ok(match webhook {
            None => None,
            Some(webhook) => webhook.webhook_secret,
        })
    }

    /// Verify that the user exists and the confirmed its email.
    async fn is_user_valid(&self, user_id: &str) -> Result<bool> {
        tracing::info!("Validating user - user_id = {user_id}");

        let user_uuid = str_to_uuid(user_id)?;

        let user: Option<UserValidation> = sqlx::query_as!(
            UserValidation,
            r#"
            SELECT user_id
            FROM admyral.user_profile
            WHERE user_id = $1 AND email_confirmed_at IS NOT NULL
            LIMIT 1
            "#,
            user_uuid
        )
        .fetch_optional(&self.pg_pool)
        .await?;

        let is_valid = user.is_some();

        tracing::info!("Finished validating user - user_id = {user_id}");

        Ok(is_valid)
    }

    async fn is_workflow_owned_by_user(&self, user_id: &str, workflow_id: &str) -> Result<bool> {
        tracing::info!("Validating workflow id - workflow_id = {workflow_id}, user_id = {user_id}");

        let user_uuid = str_to_uuid(user_id)?;
        let workflow_uuid = str_to_uuid(workflow_id)?;

        let workflow: Option<WorkflowValidation> = sqlx::query_as!(
            WorkflowValidation,
            r#"
            SELECT workflow_id
            FROM admyral.workflow
            WHERE workflow_id = $1 AND user_id = $2 AND is_template = false
            LIMIT 1
            "#,
            workflow_uuid,
            user_uuid
        )
        .fetch_optional(&self.pg_pool)
        .await?;

        let is_valid = workflow.is_some();

        tracing::info!(
            "Finished validating workflow - user_id = {user_id}, workflow_id = {workflow_id}"
        );

        Ok(is_valid)
    }

    async fn fetch_action(&self, workflow_id: &str, action_id: &str) -> Result<Option<ActionRow>> {
        tracing::info!("Fetching action - action_id = {action_id}");

        let workflow_uuid = str_to_uuid(workflow_id)?;
        let action_uuid = str_to_uuid(action_id)?;

        let action: Option<ActionRow> = sqlx::query_as!(
            ActionRow,
            r#"
            SELECT action_id, workflow_id, action_name, reference_handle, action_type::text AS "action_type!: String", action_definition
            FROM admyral.action_node
            WHERE workflow_id = $1 AND action_id = $2
            LIMIT 1
            "#,
            workflow_uuid,
            action_uuid
        )
        .fetch_optional(&self.pg_pool)
        .await?;

        tracing::info!("Finished fetching action - action_id = {action_id}");

        Ok(action)
    }

    async fn fetch_secret(
        &self,
        workflow_id: &str,
        credential_name: &str,
    ) -> Result<Option<Credential>> {
        tracing::info!(
            "Fetching secret - worklow_id = {workflow_id}, credential_name = {credential_name}"
        );

        let workflow_uuid = str_to_uuid(workflow_id)?;

        let credential: Option<Credential> = sqlx::query_as!(
            Credential,
            r#"
            SELECT c.encrypted_secret AS secret, c.credential_type
            FROM admyral.workflow w
            JOIN admyral.credential c ON w.user_id = c.user_id
            WHERE c.credential_name = $1 AND w.workflow_id = $2 AND w.user_id IS NOT NULL AND w.is_template = false
            LIMIT 1
            "#,
            credential_name,
            workflow_uuid
        )
        .fetch_optional(&self.pg_pool)
        .await?;

        tracing::info!("Finished fetching secret - workflow_id = {workflow_id}, credential_name = {credential_name}");

        match credential {
            None => Ok(None),
            Some(mut credential) => {
                credential.secret = crypto::decrypt_aes256_gcm(&credential.secret).await?;
                Ok(Some(credential))
            }
        }
    }

    async fn update_secret(
        &self,
        workflow_id: &str,
        credential_name: &str,
        secret: &str,
    ) -> Result<()> {
        tracing::info!("Updating secret - workflow id = {workflow_id}, secret = {secret}");

        let workflow_uuid = str_to_uuid(workflow_id)?;

        let encrypted_secret = crypto::encrypt_aes256_gcm(secret).await?;

        sqlx::query!(
            r#"
            UPDATE admyral.credential
            SET encrypted_secret = $1
            WHERE credential_name = $2 AND user_id IN (SELECT user_id FROM admyral.workflow WHERE workflow_id = $3 LIMIT 1)
            "#,
            encrypted_secret,
            credential_name,
            workflow_uuid
        )
        .execute(&self.pg_pool)
        .await?;

        Ok(())
    }

    async fn get_workflow_owner(&self, workflow_id: &str) -> Result<String> {
        tracing::info!("Fetching workflow owner - workflow id = {workflow_id}");

        let workflow_uuid = str_to_uuid(workflow_id)?;

        let owner: WorkflowOwner = sqlx::query_as!(
            WorkflowOwner,
            r#"
            SELECT user_id::TEXT AS "user_id!: String"
            FROM admyral.workflow
            WHERE workflow_id = $1 AND is_template = false AND user_id IS NOT NULL
            LIMIT 1
            "#,
            workflow_uuid
        )
        .fetch_one(&self.pg_pool)
        .await?;

        let owner_id = owner.user_id;

        tracing::info!(
            "Finished fetching workflow owner - workflow_id = {workflow_id}, user_id = {owner_id}"
        );

        Ok(owner_id)
    }

    async fn count_workflow_runs_of_account_last_hour(&self, user_id: &str) -> Result<i64> {
        tracing::info!("Counting workflow runs during the last last hour - user_id = {user_id}");

        let user_uuid = str_to_uuid(user_id)?;

        let result: WorkflowRunAggregation = sqlx::query_as!(
            WorkflowRunAggregation,
            r#"
            SELECT COUNT(*) AS "count!: i64"
            FROM admyral.workflow_run run
            JOIN admyral.workflow w on run.workflow_id = w.workflow_id
            WHERE
                w.user_id = $1
                AND run.started_timestamp >= (NOW()::TIMESTAMP - INTERVAL '1 hour')
            "#,
            user_uuid
        )
        .fetch_one(&self.pg_pool)
        .await?;

        tracing::info!(
            "Finished counting workflow runs during the last hour - user_id = {user_id}"
        );

        Ok(result.count)
    }
}
