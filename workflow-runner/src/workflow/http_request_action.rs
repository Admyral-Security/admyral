use super::context::Context;
use super::{ActionExecutor, ReferenceHandle};
use anyhow::Result;
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
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
#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]
pub struct HttpRequest {
    reference_handle: ReferenceHandle,
    url: String,
    method: HttpMethod,
    content_type: String,
    headers: HashMap<String, String>,
    payload: Option<serde_json::Value>,
}

// TODO: credential management
// TODO: unit test
impl ActionExecutor for HttpRequest {
    async fn execute(&self, context: &mut Context) -> Result<()> {
        // TODO: we need to check for data references <<...>>

        let client = REQ_CLIENT.clone();
        let headers = self
            .headers
            .iter()
            .map(|(name, value)| (HeaderName::from_str(name), HeaderValue::from_str(value)))
            .filter(|(k, v)| k.is_ok() && v.is_ok())
            .map(|(k, v)| (k.unwrap(), v.unwrap()))
            .collect::<HeaderMap>();
        let output = match self.method {
            HttpMethod::Get => {
                client
                    .get(&self.url)
                    .headers(headers)
                    .send()
                    .await?
                    .json::<serde_json::Value>()
                    .await?
            }
            HttpMethod::Post => {
                let mut builder = client.post(&self.url).headers(headers);
                if let Some(payload) = self.payload.as_ref() {
                    builder = builder.json(payload);
                }
                builder.send().await?.json::<serde_json::Value>().await?
            }
        };
        context.persist_run_state(self.reference_handle.clone(), output);
        Ok(())
    }
}
