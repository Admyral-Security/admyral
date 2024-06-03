use anyhow::{anyhow, Error, Result};
use async_trait::async_trait;
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Response;
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;

use super::context::Context;
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

    async fn get_with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        headers: HashMap<String, String>,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({}))
    }

    async fn post_with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({}))
    }

    async fn put_with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({}))
    }
}

#[derive(Clone)]
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

async fn make_get_request(
    client: &reqwest::Client,
    url: &str,
    header_parameters: &HashMap<String, String>,
) -> Result<Response> {
    let mut headers = HeaderMap::new();
    for (key, value) in header_parameters.iter() {
        headers.insert(HeaderName::from_str(key)?, HeaderValue::from_str(value)?);
    }

    client
        .get(url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| anyhow!(e))
}

async fn make_post_request(
    client: &reqwest::Client,
    url: &str,
    header_parameters: &HashMap<String, String>,
    body: &RequestBodyType,
) -> Result<Response> {
    let mut headers = HeaderMap::new();
    for (key, value) in header_parameters.iter() {
        headers.insert(HeaderName::from_str(key)?, HeaderValue::from_str(value)?);
    }

    match body {
        RequestBodyType::Form { params } => {
            // TODO: Remove content type
            headers.insert(
                "content-type",
                HeaderValue::from_str("application/x-www-form-urlencoded")?,
            );
            client
                .post(url)
                .headers(headers)
                .form(params)
                .send()
                .await
                .map_err(|e| anyhow!(e))
        }
        RequestBodyType::Json { body } => {
            // TODO: Remove content type
            headers.insert("content-type", HeaderValue::from_str("application/json")?);
            client
                .post(url)
                .headers(headers)
                .json(body)
                .send()
                .await
                .map_err(|e| anyhow!(e))
        }
    }
}

async fn make_put_request(
    client: &reqwest::Client,
    url: &str,
    header_parameters: &HashMap<String, String>,
    body: &RequestBodyType,
) -> Result<Response> {
    let mut headers = HeaderMap::new();
    for (key, value) in header_parameters.iter() {
        headers.insert(HeaderName::from_str(key)?, HeaderValue::from_str(value)?);
    }

    match body {
        RequestBodyType::Form { params } => {
            // TODO: Remove content type
            headers.insert(
                "content-type",
                HeaderValue::from_str("application/x-www-form-urlencoded")?,
            );
            client
                .put(url)
                .headers(headers)
                .form(&params)
                .send()
                .await
                .map_err(|e| anyhow!(e))
        }
        RequestBodyType::Json { body } => {
            // TODO: Remove content type
            headers.insert("content-type", HeaderValue::from_str("application/json")?);
            client
                .put(url)
                .headers(headers)
                .json(&body)
                .send()
                .await
                .map_err(|e| anyhow!(e))
        }
    }
}

enum Operation {
    Get,
    Post { body: RequestBodyType },
    Put { body: RequestBodyType },
}

impl ReqwestClient {
    async fn with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        mut headers: HashMap<String, String>,
        expected_response_status: u16,
        error_message: String,
        operation: Operation,
    ) -> Result<serde_json::Value> {
        // In a very rare case, it could happen that task 1 fetches a valid oauth access token.
        // Then, task 2 refreshes the oauth token immediately after that causing the access token
        // of task 1 to become invalid. However, task 1 would then retry and
        // is then guaranteed to fetch a valid token.

        let oauth_token = context
            .secrets_manager
            .fetch_oauth_access_token(oauth_token_name, &context.workflow_id)
            .await?;
        headers.insert(
            "Authorization".to_string(),
            format!("{} {}", oauth_token.token_type, oauth_token.access_token),
        );

        let response = match &operation {
            Operation::Get => make_get_request(&self.client, url, &headers).await?,
            Operation::Post { body } => {
                make_post_request(&self.client, url, &headers, body).await?
            }
            Operation::Put { body } => make_put_request(&self.client, url, &headers, body).await?,
        };

        let response_status = response.status().as_u16();
        if response_status == expected_response_status {
            return decode_response(response, expected_response_status, error_message).await;
        }

        if response_status != 401 {
            // We have an error, but it is not an unauthorized error. Hence, it is not due to expired oauth token.
            let error_response = response.text().await?;
            let error = format!("{error_message}. Response Status: {response_status}. Error Response Message: {error_response}");
            tracing::error!(error);
            return Err(anyhow!(error));
        }

        // Fetch token again (it will automatically refresh) and retry again.
        let oauth_token = context
            .secrets_manager
            .fetch_oauth_access_token(oauth_token_name, &context.workflow_id)
            .await?;
        headers.insert(
            "Authorization".to_string(),
            format!("{} {}", oauth_token.token_type, oauth_token.access_token),
        );

        let response = match &operation {
            Operation::Get => make_get_request(&self.client, url, &headers).await?,
            Operation::Post { body } => {
                make_post_request(&self.client, url, &headers, body).await?
            }
            Operation::Put { body } => make_put_request(&self.client, url, &headers, body).await?,
        };

        decode_response(response, expected_response_status, error_message).await
    }
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
        let response = make_get_request(&self.client, url, &header_parameters).await?;
        decode_response(response, expected_response_status, error_message).await
    }

    async fn post(
        &self,
        url: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        let response = make_post_request(&self.client, url, &headers, &body).await?;
        decode_response(response, expected_response_status, error_message).await
    }

    async fn put(
        &self,
        url: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value, Error> {
        let response = make_put_request(&self.client, url, &headers, &body).await?;
        decode_response(response, expected_response_status, error_message).await
    }

    async fn get_with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        headers: HashMap<String, String>,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        self.with_oauth_refresh(
            context,
            url,
            oauth_token_name,
            headers,
            expected_response_status,
            error_message,
            Operation::Get,
        )
        .await
    }

    async fn post_with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        self.with_oauth_refresh(
            context,
            url,
            oauth_token_name,
            headers,
            expected_response_status,
            error_message,
            Operation::Post { body },
        )
        .await
    }

    async fn put_with_oauth_refresh(
        &self,
        context: &Context,
        url: &str,
        oauth_token_name: &str,
        headers: HashMap<String, String>,
        body: RequestBodyType,
        expected_response_status: u16,
        error_message: String,
    ) -> Result<serde_json::Value> {
        self.with_oauth_refresh(
            context,
            url,
            oauth_token_name,
            headers,
            expected_response_status,
            error_message,
            Operation::Put { body },
        )
        .await
    }
}
