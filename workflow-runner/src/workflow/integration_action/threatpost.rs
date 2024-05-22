use super::{utils::xml_to_json, IntegrationExecutor};
use crate::workflow::context;
use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

lazy_static! {
    // make reqwest client singleton to leverage connection pooling
    static ref REQ_CLIENT: reqwest::Client = reqwest::Client::new();
}

const THREATPOST: &str = "Threatpost";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ThreatpostExecutor;

impl IntegrationExecutor for ThreatpostExecutor {
    async fn execute(
        &self,
        _context: &context::Context,
        api: &str,
        _credential_name: &str,
        _parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "FETCH_RSS_FEED" => fetch_rss_feed().await,
            _ => return Err(anyhow!("API {api} not implemented for {THREATPOST}.")),
        }
    }
}

// https://threatpost.com/
async fn fetch_rss_feed() -> Result<serde_json::Value> {
    let api_url = "https://threatpost.com/feed/";

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_str("application/json")?);

    let client = REQ_CLIENT.clone();
    let response = client.get(api_url).headers(headers).send().await?;

    if response.status().as_u16() != 200 {
        let error = response.text().await?;
        let error_message =
            format!("Error: Failed to call {THREATPOST} API with the following error - {error}");
        tracing::error!(error_message);
        return Err(anyhow!(error_message));
    }

    let xml = response.text().await?;
    let data = xml_to_json(xml)?;

    Ok(json!(data))
}
