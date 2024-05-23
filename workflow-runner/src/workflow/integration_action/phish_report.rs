use super::utils::{get_bool_parameter, ParameterType};
use super::{utils::get_string_parameter, IntegrationExecutor};
use crate::{postgres::fetch_secret, workflow::context};
use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::borrow::Borrow;
use std::collections::HashMap;

lazy_static! {
    // make reqwest client singleton to leverage connection pooling
    static ref REQ_CLIENT: reqwest::Client = reqwest::Client::new();
}

const PHISH_REPORT: &str = "PhishReport";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PhishReportExecutor;

impl IntegrationExecutor for PhishReportExecutor {
    async fn execute(
        &self,
        context: &context::Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "GET_HOSTING_CONTACT_INFORMATION" => {
                get_hosting_contact_information(context, credential_name, parameters).await
            }
            "LIST_TAKEDOWNS" => list_takedowns(context, credential_name).await,
            "START_TAKEDOWN" => start_takedown(context, credential_name, parameters).await,
            "GET_TAKEDOWN" => get_takedown(context, credential_name, parameters).await,
            "CLOSE_TAKEDOWN_CASE" => close_takedown(context, credential_name, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {PHISH_REPORT}.")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct PhishReportCredential {
    api_key: String,
}

#[derive(Debug, Clone)]
enum HttpRequest {
    Get,
    Post { body: serde_json::Value },
    Put { body: serde_json::Value },
}

async fn phish_report_request(
    api_url: &str,
    http_request: HttpRequest,
    credential_name: &str,
    context: &context::Context,
) -> Result<serde_json::Value> {
    let credential_secret = fetch_secret(
        context.pg_pool.borrow(),
        &context.workflow_id,
        credential_name,
    )
    .await?;
    let credential = match credential_secret {
        None => {
            let error_message = format!("Missing credentials for {PHISH_REPORT}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => serde_json::from_str::<PhishReportCredential>(&secret)?,
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        "Authorization",
        HeaderValue::from_str(&format!("Bearer {}", credential.api_key))?,
    );

    let client = REQ_CLIENT.clone();

    let response = match http_request {
        HttpRequest::Get => client.get(api_url).headers(headers).send().await?,
        HttpRequest::Post { body } => {
            headers.insert("Content-Type", HeaderValue::from_str("application/json")?);
            client
                .post(api_url)
                .headers(headers)
                .json(&body)
                .send()
                .await?
        }
        HttpRequest::Put { body } => {
            headers.insert("Content-Type", HeaderValue::from_str("application/json")?);
            client
                .put(api_url)
                .headers(headers)
                .json(&body)
                .send()
                .await?
        }
    };

    if response.status().as_u16() != 200 {
        let error = response.text().await?;
        let error_message =
            format!("Error: Failed to call {PHISH_REPORT} API with the following error - {error}");
        tracing::error!(error_message);
        return Err(anyhow!(error_message));
    }

    if let Some(content_length) = response.content_length() {
        if content_length == 0 {
            return Ok(json!({}));
        }
    }

    Ok(response.json::<serde_json::Value>().await?)
}

// https://phish.report/api/v0#tag/Analysis/paths/~1api~1v0~1hosting/get
async fn get_hosting_contact_information(
    context: &context::Context,
    credential_name: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        PHISH_REPORT,
        "GET_HOSTING_CONTACT_INFORMATION",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is required");
    let api_url = format!("https://phish.report/api/v0/hosting?url={url}");
    phish_report_request(&api_url, HttpRequest::Get, credential_name, context).await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases/get
async fn list_takedowns(
    context: &context::Context,
    credential_name: &str,
) -> Result<serde_json::Value> {
    let api_url = "https://phish.report/api/v0/cases";
    phish_report_request(&api_url, HttpRequest::Get, credential_name, context).await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases/post
async fn start_takedown(
    context: &context::Context,
    credential_name: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        PHISH_REPORT,
        "START_TAKEDOWN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is a required parameter");

    let ignore_duplicates = get_bool_parameter(
        "ignore_dupliactes",
        PHISH_REPORT,
        "START_TAKEDOWN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let body = match ignore_duplicates {
        Some(ignore_duplicates) => {
            json!({
                "ignore_duplicates": ignore_duplicates,
                "url": url
            })
        }
        None => json!({"url": url}),
    };

    let api_url = "https://phish.report/api/v0/cases";

    phish_report_request(
        &api_url,
        HttpRequest::Post { body },
        credential_name,
        context,
    )
    .await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases~1%7Bid%7D/get
async fn get_takedown(
    context: &context::Context,
    credential_name: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let case_id = get_string_parameter(
        "id",
        PHISH_REPORT,
        "GET_TAKEDOWN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("id is a required parameter");

    let api_url = format!("https://phish.report/api/v0/cases/{case_id}");
    phish_report_request(&api_url, HttpRequest::Get, credential_name, context).await
}

async fn close_takedown(
    context: &context::Context,
    credential_name: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let case_id = get_string_parameter(
        "id",
        PHISH_REPORT,
        "GET_TAKEDOWN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("id is a required parameter");
    let comment = get_string_parameter(
        "comment",
        PHISH_REPORT,
        "GET_TAKEDOWN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let body = match comment {
        None => json!({}),
        Some(comment) => json!({"comment": comment}),
    };

    let api_url = format!("https://phish.report/api/v0/cases/{case_id}/close");
    phish_report_request(
        &api_url,
        HttpRequest::Put { body },
        credential_name,
        context,
    )
    .await
}
