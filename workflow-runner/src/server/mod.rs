use axum::{http::StatusCode, response::IntoResponse, routing::get, Router};
use tower_http::cors::CorsLayer;

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}

pub async fn run_server() {
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

    let app = Router::new()
        .route("/health", get(health_check))
        .layer(CorsLayer::permissive());

    // Run app with hyper
    let addr = format!("{ip_addr}:{port}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
