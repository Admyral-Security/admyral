use anyhow::{anyhow, Error, Result};
use async_trait::async_trait;
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Response;
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;

use super::utils::xml_to_json;

lazy_static! {
    static ref REQ_CLIENT: reqwest::Client = reqwest::Client::new();
}

#[derive(Debug, Clone)]
pub enum RequestBodyType {
    Form { params: HashMap<String, String> },
    Json { body: serde_json::Value },
}

#[async_trait]
pub trait HttpClient: Send + Sync {
    async fn get(
        &self,
        url: &str,
        headers: HashMap<String, String>,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({}))
    }

    async fn post(
        &self,
        url: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({}))
    }

    async fn put(
        &self,
        url: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({}))
    }
}

#[derive(Debug, Clone)]
pub struct ReqwestClient {
    client: reqwest::Client,
}

impl ReqwestClient {
    pub fn new() -> Self {
        Self {
            client: REQ_CLIENT.clone(),
        }
    }
}

async fn decode_response(
    response: Response,
    expected_response_status: u16,
    error_message: String,
) -> Result<serde_json::Value> {
    let response_status = response.status().as_u16();
    if response_status != expected_response_status {
        let error_response = response.text().await?;
        let error = format!("{error_message}. Response Status: {response_status}. Error Response Message: {error_response}");
        tracing::error!(error);
        return Err(anyhow!(error));
    }

    if response.content_length().is_some() && response.content_length().unwrap() == 0 {
        return Ok(json!({}));
    }

    let response_headers = response.headers();

    let content_type = if let Some(content_type) = response_headers.get("content-type") {
        content_type.to_str()?.to_string()
    } else if let Some(content_type) = response_headers.get("Content-Type") {
        content_type.to_str()?.to_string()
    } else {
        String::new()
    };

    if content_type.starts_with("application/rss+xml") {
        // XML to JSON
        let xml_content = response.text().await?;
        return Ok(xml_to_json(xml_content.to_string())?);
    }
    if content_type.starts_with("text/html") {
        return Ok(json!(response.text().await?));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow!(e))
}

#[async_trait]
impl HttpClient for ReqwestClient {
    async fn get(
        &self,
        url: &str,
        header_parameters: HashMap<String, String>,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        let mut headers = HeaderMap::new();
        for (key, value) in header_parameters.iter() {
            headers.insert(HeaderName::from_str(key)?, HeaderValue::from_str(value)?);
        }

        let response = self.client.get(url).headers(headers).send().await?;

        decode_response(response, expected_response_status, error_message).await
    }

    async fn post(
        &self,
        url: &str,
        header_parameters: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        let mut headers = HeaderMap::new();
        for (key, value) in header_parameters.iter() {
            headers.insert(HeaderName::from_str(key)?, HeaderValue::from_str(value)?);
        }

        let response = match body {
            RequestBodyType::Form { params } => {
                // TODO: Remove content type
                headers.insert(
                    "content-type",
                    HeaderValue::from_str("application/x-www-form-urlencoded")?,
                );
                self.client
                    .post(url)
                    .headers(headers)
                    .form(&params)
                    .send()
                    .await?
            }
            RequestBodyType::Json { body } => {
                // TODO: Remove content type
                headers.insert("content-type", HeaderValue::from_str("application/json")?);
                self.client
                    .post(url)
                    .headers(headers)
                    .json(&body)
                    .send()
                    .await?
            }
        };

        decode_response(response, expected_response_status, error_message).await
    }

    async fn put(
        &self,
        url: &str,
        header_parameters: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value, Error> {
        let mut headers = HeaderMap::new();
        for (key, value) in header_parameters.iter() {
            headers.insert(HeaderName::from_str(key)?, HeaderValue::from_str(value)?);
        }

        let response = match body {
            RequestBodyType::Form { params } => {
                // TODO: Remove content type
                headers.insert(
                    "content-type",
                    HeaderValue::from_str("application/x-www-form-urlencoded")?,
                );
                self.client
                    .put(url)
                    .headers(headers)
                    .form(&params)
                    .send()
                    .await?
            }
            RequestBodyType::Json { body } => {
                // TODO: Remove content type
                headers.insert("content-type", HeaderValue::from_str("application/json")?);
                self.client
                    .put(url)
                    .headers(headers)
                    .json(&body)
                    .send()
                    .await?
            }
        };

        decode_response(response, expected_response_status, error_message).await
    }
}
