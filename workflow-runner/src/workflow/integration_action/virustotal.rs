use super::IntegrationExecutor;
use crate::workflow::{context, integration_action::utils::get_string_parameter};
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

const VIRUS_TOTAL: &str = "VirusTotal";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VirusTotalExecutor;

impl IntegrationExecutor for VirusTotalExecutor {
    async fn execute(
        &self,
        context: &context::Context,
        api: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "GET_A_FILE_REPORT" => get_a_file_report(context, parameters).await,
            "GET_A_DOMAIN_REPORT" => get_a_domain_report(context, parameters).await,
            "GET_IP_ADDRESS_REPORT" => get_ip_address_report(context, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for VirusTotal.")),
        }
    }
}

// TODO: return error?
// TODO: credential selection
// TODO: add retry mechanism, timeout
async fn virus_total_get_request(
    api_url: &str,
    context: &context::Context,
) -> Result<serde_json::Value> {
    // TODO: get API key - hardcoded for now
    let api_key = "...";

    let mut headers = HeaderMap::new();
    headers.insert("x-apikey", HeaderValue::from_str(api_key)?);

    let client = REQ_CLIENT.clone();
    let response = client.get(api_url).headers(headers).send().await?;

    let is_error = response.status().as_u16() != 200;
    let data = response.json::<serde_json::Value>().await?;

    Ok(json!({
        "is_error": is_error,
        "result": data,
    }))
}

// https://docs.virustotal.com/reference/file-info
async fn get_a_file_report(
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let file_hash = get_string_parameter(
        "hash",
        VIRUS_TOTAL,
        "GET_A_FILE_REPORT",
        parameters,
        context,
    )
    .await?;
    let api_url = format!("https://www.virustotal.com/api/v3/files/{file_hash}");
    virus_total_get_request(&api_url, context).await
}

// https://docs.virustotal.com/reference/domain-info
async fn get_a_domain_report(
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let domain = get_string_parameter(
        "domain",
        VIRUS_TOTAL,
        "GET_A_DOMAIN_REPORT",
        parameters,
        context,
    )
    .await?;
    let api_url = format!("https://www.virustotal.com/api/v3/domains/{domain}");
    virus_total_get_request(&api_url, context).await
}

// https://docs.virustotal.com/reference/ip-info
async fn get_ip_address_report(
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let ip = get_string_parameter(
        "ip",
        VIRUS_TOTAL,
        "GET_IP_ADDRESS_REPORT",
        parameters,
        context,
    )
    .await?;
    let api_url = format!("https://www.virustotal.com/api/v3/ip_addresses/{ip}");
    virus_total_get_request(&api_url, context).await
}
