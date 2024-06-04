use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_bool_parameter, get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const INTEGRATION: &str = "Slack";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct SlackCredential {
    api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SlackExecutor;

impl IntegrationExecutor for SlackExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        credential_name: &Option<String>,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        let credential_name = match credential_name {
            Some(credential) => credential.as_str(),
            None => return Err(anyhow!("Error: Missing credential for {INTEGRATION}")),
        };
        let api_key = context
            .secrets_manager
            .fetch_secret::<SlackCredential>(credential_name, &context.workflow_id)
            .await?
            .api_key;
        match api {
            "SEND_MESSAGE" => send_message(client, context, &api_key, parameters).await,
            "LIST_USERS" => list_users(client, context, &api_key, parameters).await,
            "LOOKUP_BY_EMAIL" => lookup_by_email(client, context, &api_key, parameters).await,
            "CONVERSATIONS_OPEN" => conversations_open(client, context, &api_key, parameters).await,
            "REACTIONS_ADD" => reactions_add(client, context, &api_key, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
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
            format!("Error: Failed to call {INTEGRATION} API"),
        )
        .await
}

async fn slack_get_request(
    client: &dyn HttpClient,
    api_url: &str,
    api_key: &str,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Authorization".to_string() => format!("Bearer {api_key}"),
        "Content-type".to_string() => "application/json".to_string(),
    };

    client
        .get(
            api_url,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} API"),
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
        "CHANNEL",
        INTEGRATION,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("channel is a required parameter");

    let text = get_string_parameter(
        "TEXT",
        INTEGRATION,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("text is a required parameter");

    let mut blocks = get_string_parameter(
        "BLOCKS",
        INTEGRATION,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    // If thread_ts is a valid string, it must not be empty!
    if blocks.is_some() && blocks.as_ref().unwrap().is_empty() {
        blocks = None;
    }

    let mut thread_ts = get_string_parameter(
        "THREAD_TS",
        INTEGRATION,
        "SEND_MESSAGE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    // If thread_ts is a valid string, it must not be empty!
    if thread_ts.is_some() && thread_ts.as_ref().unwrap().is_empty() {
        thread_ts = None;
    }

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

// Documentation: https://api.slack.com/methods/users.list
async fn list_users(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut params = Vec::new();

    if let Some(include_local) = get_bool_parameter(
        "INCLUDE_LOCALE",
        INTEGRATION,
        "LIST_USERS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        params.push(format!("include_locale={include_local}"));
    }

    match get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "LIST_USERS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        Some(limit) => {
            if limit.is_f64() {
                return Err(anyhow!("Error: Limit must not be float."));
            }

            if let Some(limit_i64) = limit.as_i64() {
                if limit_i64 < 0 {
                    return Err(anyhow!("Error: Limit must not be negative."));
                }

                params.push(format!("limit={limit_i64}"));
            } else if let Some(limit_u64) = limit.as_u64() {
                params.push(format!("limit={limit_u64}"));
            } else {
                return Err(anyhow!("Error: Unknown type for limit: {:?}", limit));
            }
        }
        None => params.push(format!("limit=200")),
    };

    let handle_pagination = match get_bool_parameter(
        "RETURN_ALL_PAGES",
        INTEGRATION,
        "LIST_USERS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        Some(return_all_pages) => return_all_pages,
        None => false,
    };

    let mut api_url = "https://slack.com/api/users.list".to_string();
    if !params.is_empty() {
        let params_string = params.join("&");
        api_url = format!("{api_url}?{params_string}");
    }

    tracing::info!("Calling Slack users.list API: {api_url}");
    let result = slack_get_request(client, &api_url, api_key).await?;

    if handle_pagination {
        let mut out = vec![result];
        loop {
            let next_cursor_opt = out
                .last()
                .unwrap()
                .get("response_metadata")
                .expect("Missing response_metadata for Slack users.list API response. API changed?")
                .get("next_cursor")
                .expect("Missing next_cursor for Slack users.list API response. API changed?")
                .as_str();

            // Check whether we have a next cursor. Otherwise we stop.
            let next_cursor = match next_cursor_opt {
                Some(next_cursor) => {
                    if next_cursor.is_empty() {
                        break;
                    }

                    let mut next_cursor = next_cursor.to_string();
                    // Cursors typically end with = and must be encoded with %3D
                    // See: https://api.slack.com/apis/pagination
                    next_cursor = next_cursor.replace("=", "%3D");
                    next_cursor
                }
                None => break,
            };

            let next_api_url = if params.is_empty() {
                format!("{api_url}?cursor={next_cursor}")
            } else {
                format!("{api_url}&cursor={next_cursor}")
            };

            tracing::info!("Calling Slack users.list API with pagination: {next_api_url}");
            let result = slack_get_request(client, &next_api_url, api_key).await?;
            out.push(result);
        }

        return Ok(json!(out));
    }

    Ok(result)
}

// Documentation: https://api.slack.com/methods/users.lookupByEmail
async fn lookup_by_email(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let email = get_string_parameter(
        "EMAIL",
        INTEGRATION,
        "LOOKUP_BY_EMAIL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("email is a required parameter");

    let api_url = format!("https://slack.com/api/users.lookupByEmail?email={email}");

    slack_get_request(client, &api_url, api_key).await
}

// Documentation: https://api.slack.com/methods/conversations.open
async fn conversations_open(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut body = HashMap::new();

    if let Some(users) = get_string_parameter(
        "USERS",
        INTEGRATION,
        "CONVERSATIONS_OPEN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !users.is_empty() {
            body.insert("users".to_string(), json!(users));
        }
    }

    if let Some(channel) = get_string_parameter(
        "CHANNEL",
        INTEGRATION,
        "CONVERSATIONS_OPEN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !channel.is_empty() {
            body.insert("channel".to_string(), json!(channel));
        }
    }

    if let Some(return_im) = get_bool_parameter(
        "RETURN_IM",
        INTEGRATION,
        "CONVERSATIONS_OPEN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        body.insert("return_im".to_string(), json!(return_im));
    }

    let api_url = "https://slack.com/api/conversations.open";

    slack_post_request(client, api_url, api_key, json!(body)).await
}

// Documentation: https://api.slack.com/methods/reactions.add
async fn reactions_add(
    client: &dyn HttpClient,
    context: &context::Context,
    api_key: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let channel = get_string_parameter(
        "CHANNEL",
        INTEGRATION,
        "REACTIONS_ADD",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("channel is a required parameter");

    let name = get_string_parameter(
        "NAME",
        INTEGRATION,
        "REACTIONS_ADD",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("name is a required parameter");

    let timestamp = get_string_parameter(
        "TIMESTAMP",
        INTEGRATION,
        "REACTIONS_ADD",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("timestamp is a required parameter");

    let body = json!({
        "channel": channel,
        "name": name,
        "timestamp": timestamp
    });

    let api_url = "https://slack.com/api/reactions.add";

    slack_post_request(client, api_url, api_key, body).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::{Credential, Database};
    use async_trait::async_trait;
    use serde_json::json;
    use std::sync::{Arc, RwLock};

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
                "ok": true,
                "response_metadata": {
                    "next_cursor": ""
                }
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
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential {
                secret: "{\"API_KEY\": \"some-api-key\"}".to_string(),
                credential_type: Some("SLACK".to_string()),
            }))
        }
    }

    struct MockDbUnknownSecret;
    #[async_trait]
    impl Database for MockDbUnknownSecret {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            Ok(None)
        }
    }

    async fn setup(db: Arc<dyn Database>) -> (Arc<MockHttpClient>, context::Context) {
        let client = Arc::new(MockHttpClient);
        let context = context::Context::init(
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
    async fn test_missing_credential() {
        let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
        let result = SlackExecutor
            .execute(
                &*client,
                &context,
                "SEND_MESSAGE",
                &Some("credentials".to_string()),
                &HashMap::new(),
            )
            .await;
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Missing credentials: \"credentials\""
        );
    }

    #[tokio::test]
    async fn test_send_message() {
        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "CHANNEL".to_string() => json!("CABCDEF"),
                "TEXT".to_string() => json!("Hello, Admyral here")
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "SEND_MESSAGE",
                    &Some("credentials".to_string()),
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
                "CHANNEL".to_string() => json!("CABCDEF"),
                "TEXT".to_string() => json!("Hello, Admyral here"),
                "BLOCKS".to_string() => json!("[{\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"New Paid Time Off request from <example.com|Fred Enriquez>\n\n<https://example.com|View request>\"}}]"),
                "THREAD_TS".to_string() => json!("1716658341.471459")
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "SEND_MESSAGE",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(value, json!({"ok": true}));
        }
    }

    #[tokio::test]
    async fn test_list_users() {
        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "INCLUDE_LOCALE".to_string() => json!(false),
                "LIMIT".to_string() => json!(1),
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_USERS",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"ok": true, "response_metadata": {"next_cursor": ""}})
            );
        }

        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "INCLUDE_LOCALE".to_string() => json!(false),
                "LIMIT".to_string() => json!(-1),
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_USERS",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_err());
            assert_eq!(
                result.err().unwrap().to_string(),
                "Error: Limit must not be negative."
            );
        }

        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "INCLUDE_LOCALE".to_string() => json!(false),
                "LIMIT".to_string() => json!(1.0),
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_USERS",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_err());
            assert_eq!(
                result.err().unwrap().to_string(),
                "Error: Limit must not be float."
            );
        }

        {
            #[derive(Default)]
            struct State {
                state: usize,
            }

            #[derive(Default)]
            struct MockHttpClientWithPagination {
                state: RwLock<State>,
            }
            #[async_trait]
            impl HttpClient for MockHttpClientWithPagination {
                async fn get(
                    &self,
                    _url: &str,
                    _headers: HashMap<String, String>,
                    _expected_response_status: u16,
                    _error_message: String,
                ) -> Result<serde_json::Value> {
                    let mut state_locked = self.state.write().unwrap();

                    if state_locked.state == 0 {
                        state_locked.state += 1;
                        return Ok(json!({
                            "ok": true,
                            "page": 0,
                            "response_metadata": {
                                "next_cursor": "abcedfgef"
                            }
                        }));
                    }

                    Ok(json!({
                        "ok": true,
                        "page": 1,
                        "response_metadata": {
                            "next_cursor": ""
                        }
                    }))
                }
            }

            let client = Arc::new(MockHttpClientWithPagination::default());

            let context = context::Context::init(
                "ddd54f25-0537-4e40-ab96-c93beee543de".to_string(),
                None,
                Arc::new(MockDb),
                client.clone(),
            )
            .await
            .unwrap();

            let parameters = hashmap! {
                "INCLUDE_LOCALE".to_string() => json!(false),
                "LIMIT".to_string() => json!(1),
                "RETURN_ALL_PAGES".to_string() => json!(true)
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_USERS",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!([
                    {
                        "ok": true,
                        "page": 0,
                        "response_metadata": {
                            "next_cursor": "abcedfgef"
                        }
                    },
                    {
                        "ok": true,
                        "page": 1,
                        "response_metadata": {
                            "next_cursor": ""
                        }
                    }
                ])
            );
        }
    }

    #[tokio::test]
    async fn test_lookup_by_email() {
        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = hashmap! {
                "EMAIL".to_string() => json!("hello@admyral.dev"),
            };
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "LOOKUP_BY_EMAIL",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"ok": true, "response_metadata": { "next_cursor": "" }})
            );
        }

        {
            let (client, context) = setup(Arc::new(MockDb)).await;
            let parameters = HashMap::new();
            let result = SlackExecutor
                .execute(
                    &*client,
                    &context,
                    "LOOKUP_BY_EMAIL",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_err());
            assert_eq!(
                result.err().unwrap().to_string(),
                "Missing parameter \"EMAIL\" for Slack LOOKUP_BY_EMAIL"
            );
        }
    }

    #[tokio::test]
    async fn test_conversations_open() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "USERS".to_string() => json!("ABCDEF,DSASDD"),
            "RETURN_IM".to_string() => json!(true)
        };
        let result = SlackExecutor
            .execute(
                &*client,
                &context,
                "CONVERSATIONS_OPEN",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_reactions_add() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "CHANNEL".to_string() => json!("C1234567890"),
            "NAME".to_string() => json!("thumbsup"),
            "TIMESTAMP".to_string() => json!("1234567890.123456")
        };
        let result = SlackExecutor
            .execute(
                &*client,
                &context,
                "REACTIONS_ADD",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }
}
