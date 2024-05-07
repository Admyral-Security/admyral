mod postgres;
mod server;
mod workflow;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    server::run_server().await?;
    Ok(())
}
