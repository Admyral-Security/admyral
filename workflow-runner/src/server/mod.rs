use anyhow::Result;
use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use sqlx::{Pool, Postgres};
use std::{borrow::Borrow, sync::Arc};
use tower_http::cors::CorsLayer;

use crate::{
    postgres::{fetch_webhook, setup_postgres_pool},
    workflow::run_workflow,
};

#[derive(Debug)]
struct SharedState {
    db_pool: Arc<Pool<Postgres>>,
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}

async fn verify_webhook(webhook_id: &str, secret: &str) -> Result<bool> {
    // TODO:
    Ok(true)
}

async fn webhook_handler(
    webhook_id: String,
    secret: String,
    db_pool: Arc<Pool<Postgres>>,
    inital_payload: Option<serde_json::Value>,
) -> impl IntoResponse {
    tracing::info!("Webhook {} triggered", webhook_id);

    match verify_webhook(&webhook_id, &secret).await {
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

    tokio::spawn(async move {
        tracing::info!("Fetching webhook data for webhook {}", webhook_id);
        let webhook = match fetch_webhook(db_pool.borrow(), &webhook_id).await {
            Ok(webhook_opt) => match webhook_opt {
                Some(webhook) => webhook,
                None => {
                    tracing::error!("The webhook {} does not exist.", webhook_id);
                    return;
                }
            },
            Err(e) => {
                tracing::error!("Error fetching webhook {}: {}", webhook_id, e);
                return;
            }
        };

        tracing::info!(
            "Running workflow {} triggered by webhook {}",
            webhook.workflow_id,
            webhook_id
        );
        if let Err(e) = run_workflow(
            webhook.workflow_id.clone(),
            webhook.reference_handle,
            inital_payload,
            db_pool.clone(),
        )
        .await
        {
            tracing::error!(
                "Error running workflow with id {}: {}",
                webhook.workflow_id,
                e
            );
        }
    });

    (StatusCode::ACCEPTED, "Ok")
}

async fn get_webhook_handler(
    Path((webhook_id, secret)): Path<(String, String)>,
    State(state): State<Arc<SharedState>>,
) -> impl IntoResponse {
    webhook_handler(webhook_id, secret, state.db_pool.clone(), None).await
}

async fn post_webhook_handler(
    Path((webhook_id, secret)): Path<(String, String)>,
    State(state): State<Arc<SharedState>>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    webhook_handler(webhook_id, secret, state.db_pool.clone(), Some(payload)).await
}

pub async fn run_server() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let mut ip_addr = "127.0.0.1";
    let mut port = "8000";
    for idx in 1..args.len() {
        if args[idx] == "--ip" {
            ip_addr = &args[idx + 1];
        }
        if args[idx] == "--port" {
            port = &args[idx + 1];
        }
    }

    let state = SharedState {
        db_pool: setup_postgres_pool().await?,
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/webhook/:webhook_id/:secret", get(get_webhook_handler))
        .route("/webhook/:webhook_id/:secret", post(post_webhook_handler))
        .layer(CorsLayer::permissive())
        .with_state(Arc::new(state));

    // Run app with hyper
    let addr = format!("{ip_addr}:{port}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
