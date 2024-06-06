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

const INTEGRATION: &str = "Opsgenie";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct OpsgenieCredential {
    api_key: String,
    instance: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OpsgenieExecutor;

impl IntegrationExecutor for OpsgenieExecutor {
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
        let credential = context
            .secrets_manager
            .fetch_secret::<OpsgenieCredential>(credential_name, &context.workflow_id)
            .await?;

        let base_api_url = if let Some(instance) = credential.instance.as_ref() {
            match instance.as_str() {
                "EU" | "eu" => "https://api.eu.opsgenie.com",
                _ => "https://api.opsgenie.com",
            }
        } else {
            "https://api.opsgenie.com"
        };

        match api {
            "CREATE_ALERT" => {
                create_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

// https://docs.opsgenie.com/docs/alert-api#section-create-alert
async fn create_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let message = get_string_parameter(
        "MESSAGE",
        INTEGRATION,
        "CREATE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message is a required parameter");

    let mut body = hashmap! {
        "message".to_string() => json!(message)
    };

    for string_field_name in [
        "ALIAS",
        "DESCRIPTION",
        "ENTITY",
        "SOURCE",
        "PRIORITY",
        "USER",
        "NOTE",
    ] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "CREATE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    for json_object_name in ["DETAILS", "RESPONDERS", "VISIBLE_TO", "ACTIONS", "TAGS"] {
        if let Some(details) = get_string_parameter(
            json_object_name,
            INTEGRATION,
            "CREATE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            let details = serde_json::from_str::<serde_json::Value>(&details)?;
            body.insert(json_object_name.to_lowercase(), details);
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Create Alert API"),
        )
        .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::{Credential, Database};
    use async_trait::async_trait;
    use serde_json::json;
    use std::sync::Arc;

    struct MockHttpClient;

    #[async_trait]
    impl HttpClient for MockHttpClient {
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
                secret: "{\"API_KEY\": \"some-api-key\", \"INSTANCE\": \"EU\"}".to_string(),
                credential_type: Some("OPSGENIE".to_string()),
            }))
        }
    }

    struct MockDbNonEu;
    #[async_trait]
    impl Database for MockDbNonEu {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential {
                secret: "{\"API_KEY\": \"some-api-key\"}".to_string(),
                credential_type: Some("OPSGENIE".to_string()),
            }))
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
    async fn test_non_eu_credential() {
        let (client, context) = setup(Arc::new(MockDbNonEu)).await;
        let parameters = hashmap! {
            "MESSAGE".to_string() => json!("Test 123")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "CREATE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_create_alert() {
        let (client, context) = setup(Arc::new(MockDbNonEu)).await;
        let parameters = hashmap! {
            "MESSAGE".to_string() => json!("Test 123"),
            "ALIAS".to_string() => json!("abcdef"),
            "DESCRIPTION".to_string() => json!("some description"),
            "ENTITY".to_string() => json!("test"),
            "SOURCE".to_string() => json!("admyral"),
            "PRIORITY".to_string() => json!("P1"),
            "USER".to_string() => json!("admyral"),
            "NOTE".to_string() => json!("test description"),
            "DETAILS".to_string() => json!("{\"key\": \"value\"}"),
            "RESPONDERS".to_string() => json!("[{\"name\": \"secops\", \"type\": \"team\"}]"),
            "VISIBLE_TO".to_string() => json!("[{\"username\": \"admyral\", \"type\": \"user\"}]"),
            "ACTIONS".to_string() => json!("[\"abc\"]"),
            "TAGS".to_string() => json!("[\"tag1\", \"tag2\"]")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "CREATE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }
}
