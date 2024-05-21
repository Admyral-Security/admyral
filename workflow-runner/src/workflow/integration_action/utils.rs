use anyhow::{anyhow, Result};
use std::collections::HashMap;

use crate::workflow::{context, reference_resolution::resolve_references};

pub async fn get_parameter(
    parameter_name: &str,
    integration_name: &str,
    api_name: &str,
    parameters: &HashMap<String, String>,
    context: &context::Context,
) -> Result<serde_json::Value> {
    match parameters.get(parameter_name) {
        None => {
            tracing::error!(
                "Missing parameter \"{parameter_name}\" for {integration_name} {api_name}"
            );
            Err(anyhow!(
                "Missing parameter \"{parameter_name}\" for {integration_name} {api_name}"
            ))
        }
        Some(value) => Ok(resolve_references(value, context).await?.value),
    }
}

pub async fn get_string_parameter(
    parameter_name: &str,
    integration_name: &str,
    api_name: &str,
    parameters: &HashMap<String, String>,
    context: &context::Context,
) -> Result<String> {
    let result = get_parameter(
        parameter_name,
        integration_name,
        api_name,
        parameters,
        context,
    )
    .await?;

    match result.clone() {
        serde_json::Value::String(value) => Ok(value),
        _ => {
            tracing::error!("Invalid \"{parameter_name}\" parameter for {integration_name} {api_name} API because not a string: {:?}", result);
            return Err(anyhow!("Invalid \"{parameter_name}\" parameter for {integration_name} {api_name} API because not a string."));
        }
    }
}
