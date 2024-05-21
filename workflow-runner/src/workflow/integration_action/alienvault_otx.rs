use crate::workflow::{context, integration_action::utils::get_string_parameter};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

use super::IntegrationExecutor;

const ALIENVAULT_OTX: &str = "AlienVault OTX";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AlienvaultOtxExecutor;

impl IntegrationExecutor for AlienvaultOtxExecutor {
    async fn execute(
        &self,
        context: &context::Context,
        api: &str,
        parameters: &HashMap<String, String>,
    ) -> Result<serde_json::Value> {
        match api {
            "GET_DOMAIN_INFORMATION" => get_domain_information(context, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for Alienvault OTX.")),
        }
    }
}

// https://otx.alienvault.com/assets/static/external_api.html#api_v1_indicators_domain__domain___section__get
async fn get_domain_information(
    context: &context::Context,
    parameters: &HashMap<String, String>,
) -> Result<serde_json::Value> {
    const API_NAME: &str = "GET_DOMAIN_INFORMATION";

    let domain = get_string_parameter(
        "domain",
        ALIENVAULT_OTX,
        "GET_DOMAIN_INFORMATION",
        parameters,
        context,
    )
    .await?;

    // TODO: implement API call

    Ok(json!({}))
}
