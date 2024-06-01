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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::{Credential, Database};
    use async_trait::async_trait;
    use std::sync::Arc;

    struct MockHttpClient;
    #[async_trait]
    impl HttpClient for MockHttpClient {
        async fn get_with_oauth_refresh(
            &self,
            _context: &Context,
            _url: &str,
            _oauth_token_name: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(json!({
                "ok": true,
            }))
        }

        async fn post_with_oauth_refresh(
            &self,
            _context: &Context,
            _url: &str,
            _oauth_token_name: &str,
            _headers: HashMap<String, String>,
            _body: RequestBodyType,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({"ok": true}))
        }
    }

    struct MockDb;
    #[async_trait]
    impl Database for MockDb {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential { secret: "{\"access_token\": \"dsaddsad\", \"refresh_token\": \"sdasdasd\", \"expires_at\": 23000, \"scope\": \"offline_access\", \"token_type\": \"Bearer\"}".to_string(), credential_type: Some("MS_TEAMS".to_string()) }))
        }
    }

    async fn setup(db: Arc<dyn Database>) -> (Arc<MockHttpClient>, Context) {
        let client = Arc::new(MockHttpClient);
        let context = Context::init(
            "ddd54f25-0537-4e40-ab96-c93beee543de".to_string(),
            None,
            db,
            client.clone(),
        )
        .await
        .unwrap();
        (client, context)
    }

    #[tokio::test]
    async fn test_send_message_in_channel() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TEAM_ID".to_string() => json!("asdsadds"),
            "CHANNEL_ID".to_string() => json!("sddsa"),
            "MESSAGE".to_string() => json!("hello from Admyral")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "SEND_MESSAGE_IN_CHANNEL",
                "credentials",
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }
}
