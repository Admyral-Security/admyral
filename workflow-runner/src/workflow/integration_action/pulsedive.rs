use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const INTEGRATION_NAME: &str = "Pulsedive";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PulsediveExecutor;

impl IntegrationExecutor for PulsediveExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        let credential = context
            .secrets_manager
            .fetch_secret::<PulsediveCredential>(credential_name, &context.workflow_id)
            .await?;

        match api {
            "EXPLORE" => explore(client, context, &credential, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION_NAME}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct PulsediveCredential {
    api_key: String,
}

async fn explore(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &PulsediveCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    let query = get_string_parameter(
        "QUERY",
        INTEGRATION_NAME,
        "EXPLORE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("query is a required parameter!");
    query_params.push(format!("q={query}"));

    let limit_opt = get_number_parameter(
        "LIMIT",
        INTEGRATION_NAME,
        "EXPLORE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    if let Some(limit_opt) = limit_opt {
        let limit = limit_opt
            .as_u64()
            .expect("Limit must be an unsigned integer");
        query_params.push(format!("limit={limit}"));
    }

    query_params.push(format!("key={}", credential.api_key));

    let api_url = format!(
        "https://pulsedive.com/api/explore.php?{}",
        query_params.join("&")
    );

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
    };

    client
        .get(
            &api_url,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION_NAME} API Explore"),
        )
        .await
}
