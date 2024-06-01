use super::IntegrationExecutor;
use crate::workflow::{
    context::Context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const INTEGRATION: &str = "Microsoft Teams";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MsTeamsExecutor;

impl IntegrationExecutor for MsTeamsExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        match api {
            "SEND_MESSAGE_IN_CHANNEL" => {
                send_message_in_channel(client, context, credential_name, parameters).await
            }
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

async fn send_message_in_channel(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let team_id = get_string_parameter(
        "TEAM_ID",
        INTEGRATION,
        "SEND_MESSAGE_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("team_id is a required parameter");

    let channel_id = get_string_parameter(
        "CHANNEL_ID",
        INTEGRATION,
        "SEND_MESSAGE_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("channel_id is a required parameter");

    let message = get_string_parameter(
        "MESSAGE",
        INTEGRATION,
        "SEND_MESSAGE_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message is a required parameter");

    let api_url =
        format!("https://graph.microsoft.com/v1.0/teams/{team_id}/channels/{channel_id}/messages");

    let body = json!({
        "body": {
            "content": message
        }
    });
    let headers = hashmap! {
        "Content-type".to_string() => "application/json".to_string()
    };

    client
        .post_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            headers,
            RequestBodyType::Json { body },
            201,
            format!("Error: Failed to call {INTEGRATION} Send Message in Channel API"),
        )
        .await
}
