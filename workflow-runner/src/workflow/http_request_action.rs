use super::context::Context;
use super::reference_resolution::resolve_references;
use super::ActionExecutor;
use anyhow::{anyhow, Result};
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

impl HttpRequest {
    fn from_json_impl(definition: serde_json::Value) -> Result<Self> {
        // Manual parsing to provide the user with better error messages

        let url = definition
            .get("url")
            .ok_or(anyhow!("Missing URL"))?
            .as_str()
            .ok_or(anyhow!("URL must be a string"))?
            .to_string();
        if url.is_empty() {
            return Err(anyhow!("No URL provided"));
        }

        let method = serde_json::from_value::<HttpMethod>(
            definition
                .get("method")
                .ok_or(anyhow!("Missing Http Method"))?
                .clone(),
        )
        .map_err(|e| anyhow!("Http Method: {e}"))?;

        let content_type = definition
            .get("content_type")
            .ok_or(anyhow!("Missing Content-Type"))?
            .as_str()
            .ok_or(anyhow!("Content Type must be a string"))?
            .to_string();

        let headers = serde_json::from_value::<Vec<KeyValuePair>>(
            definition
                .get("headers")
                .ok_or(anyhow!("Missing Headers"))?
                .clone(),
        )
        .map_err(|e| anyhow!("Headers: {e}"))?;

        let payload = match definition.get("payload") {
            Some(payload) => Some(
                payload
                    .as_str()
                    .ok_or(anyhow!("Payload must be provided as a string"))?
                    .to_string(),
            ),
            None => None,
        };

        Ok(Self {
            url,
            method,
            content_type,
            headers,
            payload,
        })
    }

    pub fn from_json(action_name: &str, definition: serde_json::Value) -> Result<Self> {
        match Self::from_json_impl(definition) {
            Ok(http_request) => Ok(http_request),
            Err(e) => Err(anyhow!(
                "Configuration Error for HTTP Request Action \"{action_name}\": {e}"
            )),
        }
    }
}

impl ActionExecutor for HttpRequest {
    /// Reference resolution possible in payload, headers value, url
    async fn execute(&self, context: &Context) -> Result<serde_json::Value> {
        // Resolve references in the URL for dynamic URL construction or secrets
        let url = resolve_references(&self.url, context)
            .await?
            .value
            .as_str()
            .unwrap()
            .to_string();

        let client = REQ_CLIENT.clone();

        let headers_futures = self
            .headers
            .iter()
            .map(|key_value_pair| async move {
                let resolved_value = resolve_references(&key_value_pair.value, context)
                    .await?
                    .value
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
                    let resolved_payload = resolve_references(payload, context).await?.value;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_json() {
        let action_definition = json!({
            "url": "https://api.some.com",
            "method": "POST",
            "content_type": "application/json",
            "headers": [{"key": "Authorization", "value": "Bearer some-api-key"}],
            "body": "{\"key\": \"value\"}"
        });
        let action = HttpRequest::from_json("My Action", action_definition);
        assert!(action.is_ok());
    }

    macro_rules! from_json_error_tests {
        ($($name:ident: $value:expr,)*) => {
        $(
            #[test]
            fn $name() {
                let (input, expected) = $value;
                let result = HttpRequest::from_json("My Action", input);
                assert!(result.is_err());
                assert_eq!(expected, result.err().unwrap().to_string());
            }
        )*
        }
    }

    from_json_error_tests! {
        empty_url: (
            json!({
                "url": ""
            }),
            "Configuration Error for HTTP Request Action \"My Action\": No URL provided"
        ),
        invalid_http_method: (
            json!({
                "url": "https://api.some.com",
                "method": "PUT"
            }),
            "Configuration Error for HTTP Request Action \"My Action\": Http Method: unknown variant `PUT`, expected `GET` or `POST`"
        ),
        missing_content_type: (
            json!({
                "url": "https://api.some.com",
                "method": "GET",
                "content_type": serde_json::Value::Null
            }),
            "Configuration Error for HTTP Request Action \"My Action\": Content Type must be a string"
        ),
        missing_headers: (
            json!({
                "url": "https://api.some.com",
                "method": "GET",
                "content_type": "application/json"
            }),
            "Configuration Error for HTTP Request Action \"My Action\": Missing Headers"
        ),
    }
}
