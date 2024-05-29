mod postgres;
mod server;
mod workflow;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    match dotenvy::dotenv() {
        Ok(path) => println!("Loaded .env file: {}", path.display()),
        Err(e) => println!("Failed to load .env file: {e}")
    };
    server::run_server().await?;
    Ok(())
}
