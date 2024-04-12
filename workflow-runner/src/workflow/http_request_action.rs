use super::context::Context;
use super::reference_resolution::resolve_references;
use super::ActionExecutor;
use anyhow::Result;
use futures::future::join_all;
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;

lazy_static! {
    // make reqwest client singleton to leverage connection pooling
    static ref REQ_CLIENT: reqwest::Client = reqwest::Client::new();
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum HttpMethod {
    Get,
    Post,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    url: String,
    method: HttpMethod,
    headers: HashMap<String, String>,
    payload: Option<serde_json::Value>,
}

impl ActionExecutor for HttpRequest {
    /// Resolve reference possible in payload, headers value, url
    async fn execute(&self, context: &Context) -> Result<Option<serde_json::Value>> {
        // Resolve references in the URL for dynamic URL construction or secrets
        let url = resolve_references(&json!(self.url), context)
            .await?
            .as_str()
            .unwrap()
            .to_string();

        let client = REQ_CLIENT.clone();

        let headers_futures = self
            .headers
            .iter()
            .map(|(name, value)| async move {
                let resolved_value = resolve_references(&json!(value), context).await?;
                Ok((
                    HeaderName::from_str(name),
                    HeaderValue::from_str(&resolved_value.to_string()),
                ))
            })
            .collect::<Vec<_>>();
        let result = join_all(headers_futures).await;
        let result: Result<Vec<_>> = result.into_iter().collect();
        let headers = result?
            .into_iter()
            .filter(|(k, v)| k.is_ok() && v.is_ok())
            .map(|(k, v)| (k.unwrap(), v.unwrap()))
            .collect::<HeaderMap>();

        let response = match self.method {
            HttpMethod::Get => client.get(url).headers(headers).send().await?,
            HttpMethod::Post => {
                let mut builder = client.post(url).headers(headers);
                if let Some(payload) = self.payload.as_ref() {
                    // Resolve references in the POST request payload
                    let resolved_payload = resolve_references(payload, context).await?;
                    builder = builder.json(&resolved_payload);
                }
                builder.send().await?
            }
        };

        let status = response.status().as_u16();

        let headers = json!(response
            .headers()
            .iter()
            .map(|(key, value)| (
                key.as_str().to_string(),
                value.to_str().unwrap().to_string()
            ))
            .collect::<HashMap<String, String>>());

        // TODO: consider the content type of the resposne and parse the response accordingly
        let response_text = response.text().await?;
        let body = if let Ok(json) = serde_json::from_str(&response_text) {
            json
        } else {
            json!(response_text)
        };

        Ok(Some(json!({
            "status": status,
            "headers": headers,
            "body": body
        })))
    }
}
