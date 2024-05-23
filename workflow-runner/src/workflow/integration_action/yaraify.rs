use super::{
    utils::{get_string_parameter, ParameterType},
    IntegrationExecutor,
};
use crate::workflow::context;
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

const YARAIFY: &str = "YARAify";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct YaraifyExecutor;

impl IntegrationExecutor for YaraifyExecutor {
    async fn execute(
        &self,
        context: &context::Context,
        api: &str,
        _credential_name: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "QUERY_A_FILE_HASH" => query_a_file_hash(context, parameters).await,
            "QUERY_YARA_RULE" => query_yara_rule(context, parameters).await,
            "QUERY_CLAMAV_SIGNATURE" => query_clamav_signature(context, parameters).await,
            "QUERY_IMPHASH" => query_imphash(context, parameters).await,
            "QUERY_TLSH" => query_tlsh(context, parameters).await,
            "QUERY_TELFHASH" => query_telfhash(context, parameters).await,
            "QUERY_GIMPHASH" => query_gimphash(context, parameters).await,
            "QUERY_ICON_DHASH" => query_icon_dhash(context, parameters).await,
            "LIST_RECENTLY_DEPLOYED_YARA_RULES" => list_recently_deployed_yara_rules().await,
            _ => return Err(anyhow!("API {api} not implemented for {YARAIFY}.")),
        }
    }
}

async fn query_yaraify(query: &str, search_term_opt: Option<&str>) -> Result<serde_json::Value> {
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_str("application/json")?);

    let client = REQ_CLIENT.clone();

    let body = match search_term_opt {
        Some(search_term) => json!({"query": query, "search_term": search_term}),
        None => json!({"query": query}),
    };

    let response = client
        .post("https://yaraify-api.abuse.ch/api/v1/")
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    if response.status().as_u16() != 200 {
        let error = response.text().await?;
        let error_message =
            format!("Error: Failed to call {YARAIFY} API with the following error - {error}");
        tracing::error!(error_message);
        return Err(anyhow!(error_message));
    }
    Ok(response.json::<serde_json::Value>().await?)
}

// https://yaraify.abuse.ch/api/#query-filehash
async fn query_a_file_hash(
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
    query_yaraify("lookup_hash", Some(&file_hash)).await
}

// https://yaraify.abuse.ch/api/#yara
async fn query_yara_rule(
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
    query_yaraify("get_yara", Some(&yara_rule)).await
}

// https://yaraify.abuse.ch/api/#clamav
async fn query_clamav_signature(
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
    query_yaraify("get_clamav", Some(&clamav)).await
}

// https://yaraify.abuse.ch/api/#imphash
async fn query_imphash(
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
    query_yaraify("get_imphash", Some(&imphash)).await
}

// https://yaraify.abuse.ch/api/#tlsh
async fn query_tlsh(
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
    query_yaraify("get_tlsh", Some(&tlsh)).await
}

// https://yaraify.abuse.ch/api/#telfhash
async fn query_telfhash(
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
    query_yaraify("get_telfhash", Some(&telfhash)).await
}

// https://yaraify.abuse.ch/api/#gimphash
async fn query_gimphash(
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
    query_yaraify("get_gimphash", Some(&gimphash)).await
}

// https://yaraify.abuse.ch/api/#dhash_icon
async fn query_icon_dhash(
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
    query_yaraify("get_dhash_icon", Some(&icon_dhash)).await
}

// https://yaraify.abuse.ch/api/#yara-recent
async fn list_recently_deployed_yara_rules() -> Result<serde_json::Value> {
    query_yaraify("recent_yararules", None).await
}
