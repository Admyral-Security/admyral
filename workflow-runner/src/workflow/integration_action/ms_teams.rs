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
        credential_name: &Option<String>,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        let credential_name = match credential_name {
            Some(credential) => credential.as_str(),
            None => return Err(anyhow!("Error: Missing credential for {INTEGRATION}")),
        };
        match api {
            "SEND_MESSAGE_IN_CHANNEL" => {
                send_message_in_channel(client, context, credential_name, parameters).await
            }
            "SEND_MESSAGE_IN_CHAT" => {
                send_message_in_chat(client, context, credential_name, parameters).await
            }
            "CREATE_CHAT" => create_chat(client, context, credential_name, parameters).await,
            "SEND_REPLY_IN_CHANNEL" => {
                send_reply_in_channel(client, context, credential_name, parameters).await
            }
            "LIST_USERS" => list_users(client, context, credential_name, parameters).await,
            "LIST_CHANNELS" => list_channels(client, context, credential_name, parameters).await,
            "LIST_TEAMS" => list_teams(client, context, credential_name, parameters).await,
            "LIST_CHATS" => list_chats(client, context, credential_name, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

// https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http#http-request
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

// https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0&tabs=http
async fn send_message_in_chat(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let chat_id = get_string_parameter(
        "CHAT_ID",
        INTEGRATION,
        "SEND_MESSAGE_IN_CHAT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("chat_id is a required parameter");

    let message = get_string_parameter(
        "MESSAGE",
        INTEGRATION,
        "SEND_MESSAGE_IN_CHAT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message is a required parameter");

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/chats/{}/messages",
        chat_id
    );

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
            format!("Error: Failed to call {INTEGRATION} Send Message in Chat API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/chatmessage-post-replies?view=graph-rest-1.0&tabs=http
async fn send_reply_in_channel(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let team_id = get_string_parameter(
        "TEAM_ID",
        INTEGRATION,
        "SEND_REPLY_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("team_id is a required parameter");

    let channel_id = get_string_parameter(
        "CHANNEL_ID",
        INTEGRATION,
        "SEND_REPLY_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("channel_id is a required parameter");

    let message_id = get_string_parameter(
        "MESSAGE_ID",
        INTEGRATION,
        "SEND_REPLY_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message_id is a required parameter");

    let message = get_string_parameter(
        "MESSAGE",
        INTEGRATION,
        "SEND_REPLY_IN_CHANNEL",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message is a required parameter");

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/teams/{team_id}/channels/{channel_id}/messages/{message_id}/replies"
    );

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
            format!("Error: Failed to call {INTEGRATION} Send Reply in Channel API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/chat-post?view=graph-rest-1.0&tabs=http
async fn create_chat(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let topic = get_string_parameter(
        "TOPIC",
        INTEGRATION,
        "CREATE_CHAT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let members_string = get_string_parameter(
        "MEMBERS",
        INTEGRATION,
        "CREATE_CHAT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("members is a required parameter");

    let members = match serde_json::from_str::<serde_json::Value>(&members_string) {
        Ok(members) => members,
        Err(e) => {
            tracing::error!("Failed to parse \"Members\": {members_string}. Error: {e}");
            return Err(anyhow!("Error: Input \"Members\" is not a JSON array."));
        }
    };

    let chattype = get_string_parameter(
        "CHAT_TYPE",
        INTEGRATION,
        "CREATE_CHAT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("chattype is a required parameter");

    let api_url = "https://graph.microsoft.com/v1.0/chats";

    let body = if let Some(topic) = topic {
        json!({
            "topic": topic,
            "chatType": chattype,
            "members": members
        })
    } else {
        json!({
            "chatType": chattype,
            "members": members
        })
    };

    let headers = hashmap! {
        "Content-type".to_string() => "application/json".to_string()
    };

    client
        .post_with_oauth_refresh(
            context,
            api_url,
            credential_name,
            headers,
            RequestBodyType::Json { body },
            201,
            format!("Error: Failed to call {INTEGRATION} Create Chat API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0&tabs=http
async fn list_users(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let top = get_string_parameter(
        "TOP",
        INTEGRATION,
        "LIST_USERS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let skip = get_string_parameter(
        "SKIP",
        INTEGRATION,
        "LIST_USERS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let filter = get_string_parameter(
        "FILTER",
        INTEGRATION,
        "LIST_USERS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut query_params = vec![];
    if let Some(t) = top {
        query_params.push(format!("$top={}", t));
    }
    if let Some(s) = skip {
        query_params.push(format!("$skip={}", s));
    }
    if let Some(f) = filter {
        query_params.push(format!("$filter={}", f));
    }

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/users?{}",
        query_params.join("&")
    );

    let headers = hashmap! {
        "Content-type".to_string() => "application/json".to_string()
    };

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} List Users API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0&tabs=http#http-request
async fn list_channels(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let team_id = get_string_parameter(
        "TEAM_ID",
        INTEGRATION,
        "LIST_CHANNELS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("team_id is a required parameter");

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/teams/{}/channels",
        team_id
    );

    let headers = hashmap! {
        "Content-type".to_string() => "application/json".to_string()
    };

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} List Channels API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/teams-list-all-teams?context=graph%2Fapi%2F1.0&view=graph-rest-1.0#request
async fn list_teams(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let top = get_string_parameter(
        "TOP",
        INTEGRATION,
        "LIST_TEAMS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let skip = get_string_parameter(
        "SKIP",
        INTEGRATION,
        "LIST_TEAMS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut query_params = vec![];
    if let Some(t) = top {
        query_params.push(format!("$top={}", t));
    }
    if let Some(s) = skip {
        query_params.push(format!("$skip={}", s));
    }

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/teams?{}",
        query_params.join("&")
    );

    let headers = hashmap! {
        "Content-type".to_string() => "application/json".to_string()
    };

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} List Teams API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0&tabs=http#http-request
async fn list_chats(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let top = get_string_parameter(
        "TOP",
        INTEGRATION,
        "LIST_CHATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let skip = get_string_parameter(
        "SKIP",
        INTEGRATION,
        "LIST_CHATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let filter = get_string_parameter(
        "FILTER",
        INTEGRATION,
        "LIST_CHATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut query_params = vec![];
    if let Some(t) = top {
        query_params.push(format!("$top={}", t));
    }
    if let Some(s) = skip {
        query_params.push(format!("$skip={}", s));
    }
    if let Some(f) = filter {
        query_params.push(format!("$filter={}", f));
    }

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/chats?{}",
        query_params.join("&")
    );

    let headers = hashmap! {
        "Content-type".to_string() => "application/json".to_string()
    };

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} List Chats API"),
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
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_send_message_in_chat() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "CHAT_ID".to_string() => json!("chat-id"),
            "MESSAGE".to_string() => json!("hello from Admyral")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "SEND_MESSAGE_IN_CHAT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_create_chat() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TOPIC".to_string() => json!("New Project Discussion"),
            "MEMBERS".to_string() => json!("[{ \"@odata.type\": \"#microsoft.graph.aadUserConversationMember\", \"user@odata.bind\": \"https://graph.microsoft.com/v1.0/users('user1@example.com')\", \"roles\": [\"owner\"] }, { \"@odata.type\": \"#microsoft.graph.aadUserConversationMember\", \"user@odata.bind\": \"https://graph.microsoft.com/v1.0/users('user2@example.com')\", \"roles\": [\"member\"] }]"),
            "CHAT_TYPE".to_string() => json!("oneOnOne")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "CREATE_CHAT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_send_reply_in_channel() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TEAM_ID".to_string() => json!("asdsadds"),
            "CHANNEL_ID".to_string() => json!("sddsa"),
            "MESSAGE_ID".to_string() => json!("message123"),
            "MESSAGE".to_string() => json!("reply from Admyral")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "SEND_REPLY_IN_CHANNEL",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_list_users() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TOP".to_string() => json!("10"),
            "SKIP".to_string() => json!("5"),
            "FILTER".to_string() => json!("startsWith(displayName,'J')")
        };
        let result = MsTeamsExecutor
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
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_list_channels() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TEAM_ID".to_string() => json!("team-id")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "LIST_CHANNELS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_list_teams() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TOP".to_string() => json!("10"),
            "SKIP".to_string() => json!("5")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "LIST_TEAMS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_list_chats() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "TOP".to_string() => json!("10"),
            "SKIP".to_string() => json!("5"),
            "FILTER".to_string() => json!("chatType eq 'group'")
        };
        let result = MsTeamsExecutor
            .execute(
                &*client,
                &context,
                "LIST_CHATS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }
}
