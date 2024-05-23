use super::{utils::ParameterType, IntegrationExecutor};
use crate::{
    postgres::fetch_secret,
    workflow::{context, integration_action::utils::get_string_parameter},
};
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

const ALIENVAULT_OTX: &str = "AlienVault OTX";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AlienvaultOtxExecutor;

impl IntegrationExecutor for AlienvaultOtxExecutor {
    async fn execute(
        &self,
        context: &context::Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "GET_DOMAIN_INFORMATION" => {
                get_domain_information(context, credential_name, parameters).await
            }
            _ => return Err(anyhow!("API {api} not implemented for {ALIENVAULT_OTX}.")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct AlienvaultOtxCredential {
    api_key: String,
}

// TODO: add retry, timeout
async fn alienvault_get_request(
    api_url: &str,
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
            let error_message = format!("Missing credentials for {ALIENVAULT_OTX}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => serde_json::from_str::<AlienvaultOtxCredential>(&secret)?,
    };

    let mut headers = HeaderMap::new();
    headers.insert("X-OTX-API-KEY", HeaderValue::from_str(&credential.api_key)?);
    headers.insert("Content-Type", HeaderValue::from_str("application/json")?);

    let client = REQ_CLIENT.clone();
    let response = client.get(api_url).headers(headers).send().await?;

    if response.status().as_u16() != 200 {
        let error = response.text().await?;
        let error_message = format!(
            "Error: Failed to call {ALIENVAULT_OTX} API with the following error - {error}"
        );
        tracing::error!(error_message);
        return Err(anyhow!(error_message));
    }

    Ok(response.json::<serde_json::Value>().await?)
}

// https://otx.alienvault.com/assets/static/external_api.html#api_v1_indicators_domain__domain___section__get
async fn get_domain_information(
    context: &context::Context,
    credential_name: &str,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    let domain = get_string_parameter(
        "domain",
        ALIENVAULT_OTX,
        "GET_DOMAIN_INFORMATION",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("domain is required");
    let api_url = format!("https://otx.alienvault.com/api/v1/indicators/domain/{domain}/general");
    alienvault_get_request(&api_url, credential_name, context).await
}
