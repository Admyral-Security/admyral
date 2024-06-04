use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::HttpClient,
    utils::{get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const INTEGRATION: &str = "Pulsedive";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PulsediveExecutor;

impl IntegrationExecutor for PulsediveExecutor {
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
        let credential = context
            .secrets_manager
            .fetch_secret::<PulsediveCredential>(credential_name, &context.workflow_id)
            .await?;
        match api {
            "EXPLORE" => explore(client, context, &credential, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}")),
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
        INTEGRATION,
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
        INTEGRATION,
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
            format!("Error: Failed to call {INTEGRATION} API Explore"),
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
        async fn get(
            &self,
            _url: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(json!({
                "result": "ok"
            }))
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
                credential_type: Some("PULSEDIVE".to_string()),
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
        let result = PulsediveExecutor
            .execute(
                &*client,
                &context,
                "EXPLORE",
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
    async fn test_explore() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PulsediveExecutor
            .execute(
                &*client,
                &context,
                "EXPLORE",
                &Some("credentials".to_string()),
                &hashmap! {
                    "QUERY".to_string() => json!("ioc=pulsedive.com or threat=ryuk"),
                    "LIMIT".to_string() => json!(10)
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }
}