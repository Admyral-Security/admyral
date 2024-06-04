use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::HttpClient,
    utils::{get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const GREYNOISE: &str = "GreyNoise";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct GreyNoiseCredential {
    api_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GreyNoiseExecutor;

impl IntegrationExecutor for GreyNoiseExecutor {
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
            None => return Err(anyhow!("Error: Missing credential for {GREYNOISE}")),
        };
        let api_token = context
            .secrets_manager
            .fetch_secret::<GreyNoiseCredential>(credential_name, &context.workflow_id)
            .await?
            .api_token;
        match api {
            "IP_LOOKUP" => ip_lookup(client, &api_token, context, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {GREYNOISE}.")),
        }
    }
}

// TODO: add retry, timeout
async fn greynoise_get_request(
    client: &dyn HttpClient,
    api_token: &str,
    api_url: &str,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "key".to_string() => api_token.to_string(),
        "Accept".to_string() => "application/json".to_string()
    };
    let response = client
        .get(
            api_url,
            headers,
            200,
            format!("Error: Failed to call {GREYNOISE} API"),
        )
        .await?;
    Ok(response)
}

async fn ip_lookup(
    client: &dyn HttpClient,
    api_token: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        GREYNOISE,
        "IP_LOOKUP",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");

    let api_url = format!("https://api.greynoise.io/v2/noise/context/{ip_address}");
    greynoise_get_request(client, api_token, &api_url).await
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
                "ip": "1.1.1.1"
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
                secret: "{\"API_TOKEN\": \"some-api-token\"}".to_string(),
                credential_type: Some("GREYNOISE".to_string()),
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
    async fn test_ip_lookup() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "IP_ADDRESS".to_string() => json!("1.1.1.1") };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_LOOKUP",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("ip").unwrap(), "1.1.1.1");
    }

    #[tokio::test]
    async fn test_missing_credential() {
        let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_LOOKUP",
                &Some("credentials".to_string()),
                &HashMap::new(),
            )
            .await;
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Error: Missing credential for GreyNoise"
        );
    }
}
