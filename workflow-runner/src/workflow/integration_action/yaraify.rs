use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, PostRequest},
    utils::{get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const YARAIFY: &str = "YARAify";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct YaraifyExecutor;

impl IntegrationExecutor for YaraifyExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        _credential_name: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "QUERY_A_FILE_HASH" => query_a_file_hash(client, context, parameters).await,
            "QUERY_YARA_RULE" => query_yara_rule(client, context, parameters).await,
            "QUERY_CLAMAV_SIGNATURE" => query_clamav_signature(client, context, parameters).await,
            "QUERY_IMPHASH" => query_imphash(client, context, parameters).await,
            "QUERY_TLSH" => query_tlsh(client, context, parameters).await,
            "QUERY_TELFHASH" => query_telfhash(client, context, parameters).await,
            "QUERY_GIMPHASH" => query_gimphash(client, context, parameters).await,
            "QUERY_ICON_DHASH" => query_icon_dhash(client, context, parameters).await,
            "LIST_RECENTLY_DEPLOYED_YARA_RULES" => list_recently_deployed_yara_rules(client).await,
            _ => return Err(anyhow!("API {api} not implemented for {YARAIFY}.")),
        }
    }
}

async fn query_yaraify(
    client: &dyn HttpClient,
    query: &str,
    search_term_opt: Option<&str>,
) -> Result<serde_json::Value> {
    let body = match search_term_opt {
        Some(search_term) => json!({"query": query, "search_term": search_term}),
        None => json!({"query": query}),
    };

    let response = client
        .post(
            "https://yaraify-api.abuse.ch/api/v1/",
            HashMap::new(),
            PostRequest::Json { body },
            200,
            format!("Error: Failed to call {YARAIFY} API"),
        )
        .await?;

    Ok(response)
}

// https://yaraify.abuse.ch/api/#query-filehash
async fn query_a_file_hash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let file_hash = get_string_parameter(
        "hash",
        YARAIFY,
        "QUERY_A_FILE_HASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("file_hash is required");
    query_yaraify(client, "lookup_hash", Some(&file_hash)).await
}

// https://yaraify.abuse.ch/api/#yara
async fn query_yara_rule(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let yara_rule = get_string_parameter(
        "yara",
        YARAIFY,
        "QUERY_YARA_RULE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("yara is required");
    query_yaraify(client, "get_yara", Some(&yara_rule)).await
}

// https://yaraify.abuse.ch/api/#clamav
async fn query_clamav_signature(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let clamav = get_string_parameter(
        "clamav",
        YARAIFY,
        "QUERY_CLAMAV_SIGNATURE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("clamav is required");
    query_yaraify(client, "get_clamav", Some(&clamav)).await
}

// https://yaraify.abuse.ch/api/#imphash
async fn query_imphash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let imphash = get_string_parameter(
        "imphash",
        YARAIFY,
        "QUERY_IMPHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("imphash is required");
    query_yaraify(client, "get_imphash", Some(&imphash)).await
}

// https://yaraify.abuse.ch/api/#tlsh
async fn query_tlsh(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let tlsh = get_string_parameter(
        "tlsh",
        YARAIFY,
        "QUERY_TLSH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("tlsh is required");
    query_yaraify(client, "get_tlsh", Some(&tlsh)).await
}

// https://yaraify.abuse.ch/api/#telfhash
async fn query_telfhash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let telfhash = get_string_parameter(
        "telfhash",
        YARAIFY,
        "QUERY_TELFHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("telfhash is required");
    query_yaraify(client, "get_telfhash", Some(&telfhash)).await
}

// https://yaraify.abuse.ch/api/#gimphash
async fn query_gimphash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let gimphash = get_string_parameter(
        "gimphash",
        YARAIFY,
        "QUERY_GIMPHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("gimphash is required");
    query_yaraify(client, "get_gimphash", Some(&gimphash)).await
}

// https://yaraify.abuse.ch/api/#dhash_icon
async fn query_icon_dhash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let icon_dhash = get_string_parameter(
        "icon_dhash",
        YARAIFY,
        "QUERY_ICON_DHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("icon_dhash is required");
    query_yaraify(client, "get_dhash_icon", Some(&icon_dhash)).await
}

// https://yaraify.abuse.ch/api/#yara-recent
async fn list_recently_deployed_yara_rules(client: &dyn HttpClient) -> Result<serde_json::Value> {
    query_yaraify(client, "recent_yararules", None).await
}
