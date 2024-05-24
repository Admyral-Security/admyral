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

const ALIENVAULT_OTX: &str = "AlienVault OTX";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct AlienvaultOtxCredential {
    api_key: String,
}

async fn fetch_api_key(credential_name: &str, context: &context::Context) -> Result<String> {
    let credential_secret = context
        .db
        .fetch_secret(&context.workflow_id, credential_name)
        .await?;
    let credential = match credential_secret {
        None => {
            let error_message = format!("Missing credentials for {ALIENVAULT_OTX}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => serde_json::from_str::<AlienvaultOtxCredential>(&secret)?,
    };
    Ok(credential.api_key)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AlienvaultOtxExecutor;

impl IntegrationExecutor for AlienvaultOtxExecutor {
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
            "GET_DOMAIN_INFORMATION" => {
                get_domain_information(client, &api_key, context, parameters).await
            }
            _ => return Err(anyhow!("API {api} not implemented for {ALIENVAULT_OTX}.")),
        }
    }
}

// TODO: add retry, timeout
async fn alienvault_get_request(
    client: &dyn HttpClient,
    api_key: &str,
    api_url: &str,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "X-OTX-API-KEY".to_string() => api_key.to_string(),
    };

    let response = client
        .get(
            api_url,
            headers,
            200,
            format!("Error: Failed to call {ALIENVAULT_OTX} API"),
        )
        .await?;

    Ok(response)
}

// https://otx.alienvault.com/assets/static/external_api.html#api_v1_indicators_domain__domain___section__get
async fn get_domain_information(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let domain = get_string_parameter(
        "domain",
        ALIENVAULT_OTX,
        "GET_DOMAIN_INFORMATION",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("domain is required");
    let api_url = format!("https://otx.alienvault.com/api/v1/indicators/domain/{domain}/general");
    alienvault_get_request(client, api_key, &api_url).await
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
                "domain": "admyral.dev"
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
    async fn test_get_domain_information() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "domain".to_string() => json!("admyral.dev") };

        let result = AlienvaultOtxExecutor
            .execute(
                &*client,
                &context,
                "GET_DOMAIN_INFORMATION",
                "credentials",
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value.as_object().unwrap().get("domain").unwrap(),
            "admyral.dev"
        );
    }

    #[tokio::test]
    async fn test_missing_credential() {
        let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
        let result = AlienvaultOtxExecutor
            .execute(
                &*client,
                &context,
                "GET_DOMAIN_INFORMATION",
                "credentials",
                &HashMap::new(),
            )
            .await;
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Missing credentials for AlienVault OTX."
        );
    }
}
