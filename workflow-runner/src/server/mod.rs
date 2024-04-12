mod auth;
mod shared_state;

use anyhow::Result;
use auth::authenticate_webhook;
use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use shared_state::SharedState;
use sqlx::{Pool, Postgres};
use std::{borrow::Borrow, sync::Arc};
use tower_http::cors::CorsLayer;

use crate::{
    postgres::{fetch_action, fetch_webhook, is_workflow_owned_by_user},
    server::shared_state::setup_state,
    workflow::run_workflow,
};

use self::auth::JwtClaims;

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "Healthy")
}

async fn enqueue_workflow_job(
    workflow_id: String,
    start_reference_handle: String,
    initial_payload: Option<serde_json::Value>,
    db_pool: Arc<Pool<Postgres>>,
) {
    tokio::spawn(async move {
        tracing::info!("Running workflow {workflow_id} starting at {start_reference_handle}");
        if let Err(e) = run_workflow(
            workflow_id.clone(),
            start_reference_handle,
            initial_payload,
            db_pool,
        )
        .await
        {
            tracing::error!("Error running workflow with id {workflow_id}: {}", e);
        }
    });
}

async fn webhook_handler(
    webhook_id: String,
    secret: String,
    db_pool: Arc<Pool<Postgres>>,
    inital_payload: Option<serde_json::Value>,
) -> impl IntoResponse {
    tracing::info!("Webhook {} triggered", webhook_id);

    match authenticate_webhook(db_pool.borrow(), &webhook_id, &secret).await {
        Err(e) => {
            tracing::error!("Error verifying webhook: {}", e);
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
                tracing::error!("The webhook {} does not exist.", webhook_id);
                return (StatusCode::NOT_FOUND, "Webhook does not exis.");
            }
        },
        Err(e) => {
            tracing::error!("Error fetching webhook {}: {}", webhook_id, e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error: Internal server error. Try again later.",
            );
        }
    };

    enqueue_workflow_job(
        webhook.workflow_id,
        webhook.reference_handle,
        inital_payload,
        db_pool,
    )
    .await;

    (StatusCode::CREATED, "Ok")
}

async fn get_webhook_handler(
    Path((webhook_id, secret)): Path<(String, String)>,
    State(state): State<SharedState>,
) -> impl IntoResponse {
    webhook_handler(webhook_id, secret, state.db_pool.clone(), None).await
}

async fn post_webhook_handler(
    Path((webhook_id, secret)): Path<(String, String)>,
    State(state): State<SharedState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    webhook_handler(webhook_id, secret, state.db_pool.clone(), Some(payload)).await
}

#[derive(Debug, Deserialize)]
struct TriggerWorkflowRequest {
    start_action_id: String,
    payload: Option<serde_json::Value>,
}

async fn post_trigger_workflow_handler(
    claim: JwtClaims, // implements endpoint authentication
    Path(workflow_id): Path<String>,
    State(state): State<SharedState>,
    Json(request): Json<TriggerWorkflowRequest>,
) -> impl IntoResponse {
    // verify that the workflow is owned by the requesting user
    let user_id = &claim.sub;
    match is_workflow_owned_by_user(state.db_pool.borrow(), &workflow_id, user_id).await {
        Ok(is_valid) => {
            if !is_valid {
                return (StatusCode::NOT_FOUND, "Workflow does not exist.");
            }
        }
        Err(e) => {
            tracing::error!("Error validating workflow ownership: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    let action_opt = match fetch_action(
        state.db_pool.borrow(),
        &workflow_id,
        &request.start_action_id,
    )
    .await
    {
        Ok(action_opt) => action_opt,
        Err(e) => {
            tracing::error!("Error fetching action: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error");
        }
    };
    let start_reference_handle = match action_opt {
        None => return (StatusCode::NOT_FOUND, "Action does not exist."),
        Some(action) => action.reference_handle,
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
        .route("/trigger/:workflow_id", post(post_trigger_workflow_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Run app with hyper
    let addr = format!("{ip_addr}:{port}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
