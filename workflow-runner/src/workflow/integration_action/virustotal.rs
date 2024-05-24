use super::IntegrationExecutor;
use crate::{
    postgres::fetch_secret,
    workflow::{
        context,
        http_client::{HttpClient, PostRequest},
        utils::{get_string_parameter, ParameterType},
    },
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use std::borrow::Borrow;
use std::collections::HashMap;

const VIRUS_TOTAL: &str = "VirusTotal";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VirusTotalExecutor;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct VirusTotalCredential {
    api_key: String,
}

async fn get_secret(credential_name: &str, context: &context::Context) -> Result<String> {
    let credential_secret = fetch_secret(
        context.pg_pool.borrow(),
        &context.workflow_id,
        credential_name,
    )
    .await?;

    let credentials = match credential_secret {
        None => {
            let error_message = format!("Missing credentials for {VIRUS_TOTAL}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => serde_json::from_str::<VirusTotalCredential>(&secret)?,
    };

    Ok(credentials.api_key)
}

impl IntegrationExecutor for VirusTotalExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        let api_key = get_secret(credential_name, context).await?;

        match api {
            "GET_A_FILE_REPORT" => get_a_file_report(client, context, &api_key, parameters).await,
            "GET_A_DOMAIN_REPORT" => {
                get_a_domain_report(client, context, &api_key, parameters).await
            }
            "GET_IP_ADDRESS_REPORT" => {
                get_ip_address_report(client, context, &api_key, parameters).await
            }
            "GET_URL_ANALYSIS_REPORT" => {
                get_url_analysis_report(client, context, &api_key, parameters).await
            }
            "GET_FILE_BEHAVIOR_REPORTS_SUMMARY" => {
                get_file_behavior_reports_summary(client, context, &api_key, parameters).await
            }
            "GET_VOTES_ON_A_DOMAIN" => {
                get_votes_on_a_domain(client, context, &api_key, parameters).await
            }
            "GET_VOTES_ON_A_FILE" => {
                get_votes_on_a_file(client, context, &api_key, parameters).await
            }
            "GET_VOTES_ON_AN_IP_ADDRESS" => {
                get_votes_on_an_ip_address(client, context, &api_key, parameters).await
            }
            "GET_VOTES_ON_A_URL" => get_votes_on_a_url(client, context, &api_key, parameters).await,
            "SCAN_URL" => scan_url(client, context, &api_key, parameters).await,
            "GET_COMMENTS_IP_ADDRESS" => {
                get_comments_ip_address(client, context, &api_key, parameters).await
            }
            "GET_COMMENTS_DOMAIN" => {
                get_comments_domain(client, context, &api_key, parameters).await
            }
            "GET_COMMENTS_FILE" => get_comments_file(client, context, &api_key, parameters).await,
            "GET_COMMENTS_URL" => get_comments_url(client, context, &api_key, parameters).await,
            "SEARCH" => search(client, context, &api_key, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {VIRUS_TOTAL}.")),
        }
    }
}

// TODO: add retry mechanism, timeout
async fn virus_total_get_request(
    client: &dyn HttpClient,
    api_url: &str,
    api_key: &str,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "x-apikey".to_string() => api_key.to_string(),
        "Content-Type".to_string() => "application/json".to_string()
    };

    client
        .get(
            api_url,
            headers,
            200,
            format!("Error: Failed to call {VIRUS_TOTAL} API"),
        )
        .await
}

async fn virus_total_post_request(
    client: &dyn HttpClient,
    api_url: &str,
    api_key: &str,
    request_type: PostRequest,
) -> Result<serde_json::Value> {
    let mut headers = hashmap! {
        "x-apikey".to_string() => api_key.to_string(),
        "accept".to_string() => "application/json".to_string()
    };

    match &request_type {
        PostRequest::Form { .. } => headers.insert(
            "content-type".to_string(),
            "application/x-www-form-urlencoded".to_string(),
        ),
        PostRequest::Json { .. } => {
            headers.insert("content-type".to_string(), "application/json".to_string())
        }
    };

    client
        .post(
            api_url,
            headers,
            request_type,
            200,
            format!("Error: Failed to call {VIRUS_TOTAL} API"),
        )
        .await
}

/// URL Identifier Generation: https://docs.virustotal.com/reference/url#url-identifiers
fn generate_virus_total_url_identifier(url: String) -> String {
    STANDARD_NO_PAD.encode(url)
}

// https://docs.virustotal.com/reference/file-info
async fn get_a_file_report(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let file_hash = get_string_parameter(
        "hash",
        VIRUS_TOTAL,
        "GET_A_FILE_REPORT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("file_hash is required");
    let api_url = format!("https://www.virustotal.com/api/v3/files/{file_hash}");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/domain-info
async fn get_a_domain_report(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let domain = get_string_parameter(
        "domain",
        VIRUS_TOTAL,
        "GET_A_DOMAIN_REPORT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("domain is required");
    let api_url = format!("https://www.virustotal.com/api/v3/domains/{domain}");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/ip-info
async fn get_ip_address_report(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let ip = get_string_parameter(
        "ip",
        VIRUS_TOTAL,
        "GET_IP_ADDRESS_REPORT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("ip is required");
    let api_url = format!("https://www.virustotal.com/api/v3/ip_addresses/{ip}");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/url-info
async fn get_url_analysis_report(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        VIRUS_TOTAL,
        "GET_URL_ANALYSIS_REPORT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is a required parameter");
    let url_base64 = generate_virus_total_url_identifier(url);
    let api_url = format!("https://www.virustotal.com/api/v3/urls/{url_base64}");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/file-all-behaviours-summary
async fn get_file_behavior_reports_summary(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let hash = get_string_parameter(
        "hash",
        VIRUS_TOTAL,
        "GET_FILE_BEHAVIOR_REPORTS_SUMMARY",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("hash is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/files/{hash}/behaviour_summary");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/domains-votes-get
async fn get_votes_on_a_domain(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let domain = get_string_parameter(
        "domain",
        VIRUS_TOTAL,
        "GET_VOTES_ON_A_DOMAIN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("domain is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/domains/{domain}/votes");
    virus_total_get_request(client, &api_url, api_key).await
}

// TODO: pagination
// https://docs.virustotal.com/reference/files-votes-get
async fn get_votes_on_a_file(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let hash = get_string_parameter(
        "hash",
        VIRUS_TOTAL,
        "GET_VOTES_ON_A_FILE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("hash is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/files/{hash}/votes");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/ip-votes
async fn get_votes_on_an_ip_address(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let ip = get_string_parameter(
        "ip",
        VIRUS_TOTAL,
        "GET_VOTES_ON_AN_IP_ADDRESS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("ip is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/ip_addresses/{ip}/votes");
    virus_total_get_request(client, &api_url, api_key).await
}

// TODO: pagination
// https://docs.virustotal.com/reference/urls-votes-get
async fn get_votes_on_a_url(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        VIRUS_TOTAL,
        "GET_VOTES_ON_A_URL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is a required parameter");
    let url_base64 = generate_virus_total_url_identifier(url);
    let api_url = format!("https://www.virustotal.com/api/v3/urls/{url_base64}/votes");
    virus_total_get_request(client, &api_url, api_key).await
}

// https://docs.virustotal.com/reference/scan-url
async fn scan_url(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        VIRUS_TOTAL,
        "SCAN_URL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is a required parameter");
    let api_url = "https://www.virustotal.com/api/v3/urls";
    virus_total_post_request(
        client,
        &api_url,
        api_key,
        PostRequest::Form {
            params: hashmap! {
                "url".to_string() => url
            },
        },
    )
    .await
}

// TODO: pagination
// https://docs.virustotal.com/reference/ip-comments-get
async fn get_comments_ip_address(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let ip = get_string_parameter(
        "ip",
        VIRUS_TOTAL,
        "GET_COMMENTS_IP_ADDRESS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("ip is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/ip_addresses/{ip}/comments");
    virus_total_get_request(client, &api_url, api_key).await
}

// TODO: pagination
// https://docs.virustotal.com/reference/domains-comments-get
async fn get_comments_domain(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let domain = get_string_parameter(
        "domain",
        VIRUS_TOTAL,
        "GET_COMMENTS_DOMAIN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("domain is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/domains/{domain}/comments");
    virus_total_get_request(client, &api_url, api_key).await
}

// TODO: pagination
// https://docs.virustotal.com/reference/files-comments-get
async fn get_comments_file(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let hash = get_string_parameter(
        "hash",
        VIRUS_TOTAL,
        "GET_COMMENTS_FILE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("hash is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/files/{hash}/comments");
    virus_total_get_request(client, &api_url, api_key).await
}

// TODO: pagination
// https://docs.virustotal.com/reference/urls-comments-get
async fn get_comments_url(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        VIRUS_TOTAL,
        "GET_COMMENTS_URL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is a required parameter");
    let url_base64 = generate_virus_total_url_identifier(url);
    let api_url = format!("https://www.virustotal.com/api/v3/urls/{url_base64}/comments");
    virus_total_get_request(client, &api_url, api_key).await
}

// Note: ignoring pagination here because I am not sure whether there is a max. amount of search results
// https://docs.virustotal.com/reference/api-search
async fn search(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let query = get_string_parameter(
        "query",
        VIRUS_TOTAL,
        "SEARCH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("query is a required parameter");
    let api_url = format!("https://www.virustotal.com/api/v3/search?query={query}");
    virus_total_get_request(client, &api_url, api_key).await
}
