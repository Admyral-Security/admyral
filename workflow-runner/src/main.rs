mod postgres;
mod server;
mod workflow;

use anyhow::Result;
use sqlx::postgres::PgPoolOptions;

#[derive(sqlx::FromRow, Debug)]
struct Workflow {
    workflow_id: String,
    workflow_name: String,
    workflow_description: String,
    is_live: bool,
    user_id: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let subscriber = tracing_subscriber::FmtSubscriber::new();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    // server::run_server().await;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&std::env::var("DATABASE_URL").expect("Missing environment variable DATABASE_URL"))
        .await?;

    let result: Vec<Workflow> = sqlx::query_as!(
        Workflow,
        r#"
        SELECT *
        FROM workflows
    "#
    )
    .fetch_all(&pool)
    .await?;

    println!("{:?}", result);

    Ok(())
}
