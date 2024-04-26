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
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HttpMethod {
    Get,
    Post,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValuePair {
    key: String,
    value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    url: String,
    method: HttpMethod,
    content_type: String,
    headers: Vec<KeyValuePair>,
    payload: Option<String>,
}

impl ActionExecutor for HttpRequest {
    /// Reference resolution possible in payload, headers value, url
    async fn execute(&self, context: &Context) -> Result<serde_json::Value> {
        // Resolve references in the URL for dynamic URL construction or secrets
        let url = resolve_references(&self.url, context)
            .await?
            .as_str()
            .unwrap()
            .to_string();
        
        let client = REQ_CLIENT.clone();

        let headers_futures = self
            .headers
            .iter()
            .map(|key_value_pair| async move {
                let resolved_value =
                    resolve_references(&key_value_pair.value, context).await?
                    .as_str()
                    .expect("Header value must be a string!")
                    .to_string();
                Ok((
                    HeaderName::from_str(&key_value_pair.key),
                    HeaderValue::from_str(&resolved_value),
                ))
            })
            .collect::<Vec<_>>();
        let result = join_all(headers_futures).await;
        let result: Result<Vec<_>> = result.into_iter().collect();
        let mut headers = result?
            .into_iter()
            .filter(|(k, v)| k.is_ok() && v.is_ok())
            .map(|(k, v)| (k.unwrap(), v.unwrap()))
            .collect::<HeaderMap>();

        headers.insert("Content-Type", HeaderValue::from_str(&self.content_type)?);

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

        // TODO: consider the content type of the response and parse the response accordingly
        let response_text = response.text().await?;
        let body = if let Ok(json) = serde_json::from_str(&response_text) {
            json
        } else {
            json!(response_text)
        };

        Ok(json!({
            "status": status,
            "headers": headers,
            "body": body
        }))
    }
}
