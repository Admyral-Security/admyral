mod auth;
mod shared_state;

use anyhow::Result;
use async_once::AsyncOnce;
use auth::authenticate_webhook;
use axum::{
    extract::{Json, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use lazy_static::lazy_static;
use serde::Deserialize;
use serde_json::json;
use shared_state::SharedState;
use sqlx::{Pool, Postgres};
use std::collections::HashMap;
use std::{borrow::Borrow, sync::Arc};
use tower_http::cors::CorsLayer;

use crate::{
    postgres::{
        count_workflow_runs_of_account_last_hour, fetch_action, fetch_webhook, get_workflow_owner,
        is_workflow_owned_by_user,
    },
    server::shared_state::setup_state,
    workflow::run_workflow,
};

use self::auth::JwtClaims;

lazy_static! {
    static ref WORKFLOW_RUN_HOURLY_QUOTA: AsyncOnce<Option<i64>> = AsyncOnce::new(async {
        match std::env::var("WORKFLOW_RUN_HOURLY_QUOTA") {
            Err(_) => None,
            Ok(limit) => Some(
                limit
                    .parse::<i64>()
                    .expect("WORKFLOW_RUN_HOURLY_QUOTA is not a valid number!"),
            ),
        }
    });
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "Healthy")
}

async fn enqueue_workflow_job(
    workflow_id: String,
    start_reference_handle: String,
    trigger_event: Option<serde_json::Value>,
    db_pool: Arc<Pool<Postgres>>,
) {
    tokio::spawn(async move {
        tracing::info!("Running workflow {workflow_id} starting at {start_reference_handle}");
        if let Err(e) = run_workflow(
            workflow_id.clone(),
            start_reference_handle,
            trigger_event,
            db_pool,
        )
        .await
        {
            tracing::error!("Error running workflow with id {workflow_id}: {}", e);
        }
    });
}

async fn is_quota_limit_exceeded(
    user_id: Option<&str>,
    workflow_id: &str,
    quota_limit: Option<i64>,
    db_pool: &Pool<Postgres>,
) -> Result<bool> {
    let quota = match quota_limit {
        None => return Ok(false),
        Some(quota_limit) => quota_limit,
    };

    let user_id = match user_id {
        Some(user_id) => user_id.to_string(),
        None => get_workflow_owner(db_pool, &workflow_id).await?,
    };

    let runs = count_workflow_runs_of_account_last_hour(db_pool, &user_id).await?;
    let exceeded_quota = runs >= quota;
    if exceeded_quota {
        tracing::info!("User {user_id} exceeded workflow run quota. Executed {runs} workflows in the last hour. Quota is {quota}.");
    } else {
        tracing::info!(
            "User {user_id} executed {runs} workflows in the last hour. Quota is {quota}."
        )
    }
    Ok(exceeded_quota)
}

async fn webhook_handler(
    webhook_id: String,
    secret: String,
    db_pool: Arc<Pool<Postgres>>,
    trigger_event: serde_json::Value,
) -> impl IntoResponse {
    tracing::info!("Webhook {} triggered", webhook_id);

    match authenticate_webhook(db_pool.borrow(), &webhook_id, &secret).await {
        Err(e) => {
            tracing::error!("Error verifying webhook: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error: Internal server error. Try again later.",
            );
        }
        Ok(is_authorized) => {
            if !is_authorized {
                return (StatusCode::UNAUTHORIZED, "Error: Unauthorized");
            }
        }
    }

    tracing::info!("Fetching webhook data for webhook {}", webhook_id);
    let webhook = match fetch_webhook(db_pool.borrow(), &webhook_id).await {
        Ok(webhook_opt) => match webhook_opt {
            Some(webhook) => webhook,
            None => {
                tracing::error!("The webhook {webhook_id} does not exist.");
                return (StatusCode::NOT_FOUND, "Webhook does not exis.");
            }
        },
        Err(e) => {
            tracing::error!("Error fetching webhook {webhook_id}: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error: Internal server error. Try again later.",
            );
        }
    };

    let quota_limit = WORKFLOW_RUN_HOURLY_QUOTA.get().await.clone();
    match is_quota_limit_exceeded(None, &webhook.workflow_id, quota_limit, db_pool.borrow()).await {
        Err(e) => {
            tracing::error!("Error checking workflow run quota limit exceeded check: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error: Internal server error. Try again later.",
            );
        }
        Ok(is_quota_exceeded) => {
            if is_quota_exceeded {
                return (StatusCode::FORBIDDEN, "Workflow run quota limit exceeded");
            }
        }
    }

    enqueue_workflow_job(
        webhook.workflow_id,
        webhook.reference_handle,
        Some(trigger_event),
        db_pool,
    )
    .await;

    (StatusCode::CREATED, "Ok")
}

fn headersmap_to_json(headers: HeaderMap) -> serde_json::Value {
    json!(headers
        .into_iter()
        .filter(|(key, _value)| key.is_some())
        .map(|(key, value)| (key.unwrap().to_string(), json!(value.to_str().unwrap())))
        .collect::<HashMap<String, serde_json::Value>>())
}

async fn get_webhook_handler(
    Path((webhook_id, secret)): Path<(String, String)>,
    headers: HeaderMap,
    State(state): State<SharedState>,
) -> impl IntoResponse {
    let trigger_event = json!({
        "body": json!(""),
        "headers": headersmap_to_json(headers)
    });
    webhook_handler(webhook_id, secret, state.db_pool.clone(), trigger_event).await
}

async fn post_webhook_handler(
    Path((webhook_id, secret)): Path<(String, String)>,
    State(state): State<SharedState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let trigger_event = json!({
        "body": payload,
        "headers": headersmap_to_json(headers)
    });
    webhook_handler(webhook_id, secret, state.db_pool.clone(), trigger_event).await
}

#[derive(Debug, Deserialize)]
struct TriggerWorkflowRequest {
    payload: Option<serde_json::Value>,
}

async fn post_trigger_workflow_handler(
    claim: JwtClaims, // implements endpoint authentication
    Path((workflow_id, action_id)): Path<(String, String)>,
    State(state): State<SharedState>,
    Json(request): Json<TriggerWorkflowRequest>,
) -> impl IntoResponse {
    // verify that the workflow is owned by the requesting user
    let user_id = &claim.sub;
    match is_workflow_owned_by_user(state.db_pool.borrow(), user_id, &workflow_id).await {
        Ok(is_valid) => {
            if !is_valid {
                tracing::error!("Workflow {workflow_id} does not exist.");
                return (StatusCode::NOT_FOUND, "Workflow does not exist.");
            }
        }
        Err(e) => {
            tracing::error!("Error validating workflow ownership: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    let quota_limit = WORKFLOW_RUN_HOURLY_QUOTA.get().await.clone();
    match is_quota_limit_exceeded(None, &workflow_id, quota_limit, state.db_pool.borrow()).await {
        Err(e) => {
            tracing::error!("Error checking workflow run quota limit exceeded check: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error: Internal server error. Try again later.",
            );
        }
        Ok(is_quota_exceeded) => {
            if is_quota_exceeded {
                return (StatusCode::FORBIDDEN, "Workflow run quota limit exceeded");
            }
        }
    }

    let action_opt = match fetch_action(state.db_pool.borrow(), &workflow_id, &action_id).await {
        Ok(action_opt) => action_opt,
        Err(e) => {
            tracing::error!("Error fetching action: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error");
        }
    };
    let start_reference_handle = match action_opt {
        None => return (StatusCode::NOT_FOUND, "Action does not exist."),
        Some(action) => {
            if action.action_type != "WEBHOOK" && request.payload.is_some() {
                return (StatusCode::BAD_REQUEST, "Triggering workflow action with initial payload is only allowed with webhook actions!");
            }

            action.reference_handle
        }
    };

    enqueue_workflow_job(
        workflow_id,
        start_reference_handle,
        request.payload,
        state.db_pool.clone(),
    )
    .await;

    (StatusCode::ACCEPTED, "Ok")
}

pub async fn run_server() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let mut ip_addr = "127.0.0.1";
    let mut port = "4000";
    for idx in 1..args.len() {
        if args[idx] == "--ip" {
            ip_addr = &args[idx + 1];
        }
        if args[idx] == "--port" {
            port = &args[idx + 1];
        }
    }

    let state = setup_state().await?;

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/webhook/:webhook_id/:secret", get(get_webhook_handler))
        .route("/webhook/:webhook_id/:secret", post(post_webhook_handler))
        .route(
            "/trigger/:workflow_id/:action_id",
            post(post_trigger_workflow_handler),
        )
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Run app with hyper
    let addr = format!("{ip_addr}:{port}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
