use super::IntegrationExecutor;
use crate::workflow::{context, http_client::HttpClient};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const THREATPOST: &str = "Threatpost";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ThreatpostExecutor;

impl IntegrationExecutor for ThreatpostExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        _context: &context::Context,
        api: &str,
        _credential_name: &str,
        _parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "FETCH_RSS_FEED" => fetch_rss_feed(client).await,
            _ => return Err(anyhow!("API {api} not implemented for {THREATPOST}.")),
        }
    }
}

// https://threatpost.com/
async fn fetch_rss_feed(client: &dyn HttpClient) -> Result<serde_json::Value> {
    let api_url = "https://threatpost.com/feed/";

    let response = client
        .get(
            api_url,
            HashMap::new(),
            200,
            format!("Error: Failed to call {THREATPOST} API"),
        )
        .await?;

    Ok(response)
}
