use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const SLACK: &str = "Slack";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct SlackCredential {
    api_key: String,
}

async fn fetch_api_key(credential_name: &str, context: &context::Context) -> Result<String> {
    let credential_secret = context
        .db
        .fetch_secret(&context.workflow_id, credential_name)
        .await?;
    let credential = match credential_secret {
        None => {
            let error_message = format!("Missing credentials for {SLACK}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => serde_json::from_str::<SlackCredential>(&secret)?,
    };
    Ok(credential.api_key)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SlackExecutor;

impl IntegrationExecutor for SlackExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        let api_key = fetch_api_key(credential_name, context).await?;

        match api {
            "SEND_MESSAGE" => send_message(client, context, &api_key, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {SLACK}.")),
        }
    }
}

async fn slack_post_request(
    client: &dyn HttpClient,
    api_url: &str,
    api_key: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Authorization".to_string() => format!("Bearer {api_key}"),
        "Content-type".to_string() => "application/json".to_string(),
    };

    client
        .post(
            api_url,
            headers,
            RequestBodyType::Json { body },
            200,
            format!("Error: Failed to call {SLACK} API"),
        )
        .await
}

// Documentation: https://api.slack.com/methods/chat.postMessage
async fn send_message(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let channel = get_string_parameter(
        "channel",
        SLACK,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("channel is a required parameter");

    let text = get_string_parameter(
        "text",
        SLACK,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("text is a required parameter");

    let blocks = get_string_parameter(
        "blocks",
        SLACK,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let thread_ts = get_string_parameter(
        "thread_ts",
        SLACK,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let body = match (blocks, thread_ts) {
        (None, None) => json!({
            "channel": channel,
            "text": text
        }),
        (Some(blocks), None) => json!({
            "channel": channel,
            "text": text,
            "blocks": blocks,
        }),
        (None, Some(thread_ts)) => json!({
            "channel": channel,
            "text": text,
            "thread_ts": thread_ts
        }),
        (Some(blocks), Some(thread_ts)) => json!({
            "channel": channel,
            "text": text,
            "blocks": blocks,
            "thread_ts": thread_ts
        }),
    };

    let api_url = "https://api.slack.com/api/chat.postMessage";
    slack_post_request(client, api_url, api_key, body).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::Database;
    use async_trait::async_trait;
    use serde_json::json;
    use std::sync::Arc;

    struct MockHttpClient;
    #[async_trait]
    impl HttpClient for MockHttpClient {
        async fn get(
            &self,
            _url: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(json!({
                "ok": true
            }))
        }

        async fn post(
            &self,
            _url: &str,
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
        ) -> Result<Option<String>> {
            Ok(Some("{\"API_KEY\": \"some-api-key\"}".to_string()))
        }
    }

    struct MockDbUnknownSecret;
    #[async_trait]
    impl Database for MockDbUnknownSecret {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<String>> {
            Ok(None)
        }
    }

    async fn setup(db: Arc<dyn Database>) -> (Arc<MockHttpClient>, context::Context) {
        let context =
            context::Context::init("ddd54f25-0537-4e40-ab96-c93beee543de".to_string(), None, db)
                .await
                .unwrap();
        (Arc::new(MockHttpClient), context)
    }

    #[tokio::test]
    async fn test_missing_credential() {
        let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
        let result = SlackExecutor
            .execute(
                &*client,
                &context,
                "SEND_MESSAGE",
                "credentials",
                &HashMap::new(),
            )
            .await;
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Missing credentials for Slack."
        );
    }

    #[tokio::test]
    async fn test_send_message() {
        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "channel".to_string() => json!("CABCDEF"),
                "text".to_string() => json!("Hello, Admyral here")
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "SEND_MESSAGE",
                    "credentials",
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(value, json!({"ok": true}));
        }

        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "channel".to_string() => json!("CABCDEF"),
                "text".to_string() => json!("Hello, Admyral here"),
                "blocks".to_string() => json!("[{\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"New Paid Time Off request from <example.com|Fred Enriquez>\n\n<https://example.com|View request>\"}}]"),
                "thread_ts".to_string() => json!("1716658341.471459")
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "SEND_MESSAGE",
                    "credentials",
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(value, json!({"ok": true}));
        }
    }
}
