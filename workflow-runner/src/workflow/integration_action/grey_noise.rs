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

const INTEGRATION: &str = "GreyNoise";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct GreyNoiseCredential {
    api_key: String,
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
            None => return Err(anyhow!("Error: Missing credential for {INTEGRATION}")),
        };
        let api_key = context
            .secrets_manager
            .fetch_secret::<GreyNoiseCredential>(credential_name, &context.workflow_id)
            .await?
            .api_key;
        match api {
            "IP_LOOKUP" => ip_lookup(client, &api_key, context, parameters).await,
            "IP_QUICK_CHECK" => ip_quick_check(client, &api_key, context, parameters).await,
            "IP_CONTEXT" => ip_context(client, &api_key, context, parameters).await,
            "RIOT_IP_LOOKUP" => riot_ip_lookup(client, &api_key, context, parameters).await,
            "IP_SIMILARITY_LOOKUP" => {
                ip_similarity_lookup(client, &api_key, context, parameters).await
            }
            "IP_TIMELINE_DAILY_SUMMARY" => {
                ip_timeline_daily_summary(client, &api_key, context, parameters).await
            }
            "IP_TIMELINE_HOURLY_SUMMARY" => {
                ip_timeline_hourly_summary(client, &api_key, context, parameters).await
            }
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

// TODO: add retry, timeout
async fn greynoise_get_request(
    client: &dyn HttpClient,
    api_key: &str,
    api_url: &str,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "key".to_string() => api_key.to_string(),
        "Accept".to_string() => "application/json".to_string()
    };
    let response = client
        .get(
            api_url,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} API"),
        )
        .await?;
    Ok(response)
}

async fn ip_lookup(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "IP_LOOKUP",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");
    let api_url = format!("https://api.greynoise.io/v3/community/{ip_address}");
    greynoise_get_request(client, api_key, &api_url).await
}

async fn ip_quick_check(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "IP_QUICK_CHECK",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");
    let api_url = format!("https://api.greynoise.io/v2/noise/quick/{ip_address}");
    greynoise_get_request(client, api_key, &api_url).await
}

async fn ip_context(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "IP_CONTEXT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");
    let api_url = format!("https://api.greynoise.io/v2/noise/context/{ip_address}");
    greynoise_get_request(client, api_key, &api_url).await
}

async fn riot_ip_lookup(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "RIOT_IP_LOOKUP",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");
    let api_url = format!("https://api.greynoise.io/v2/riot/{ip_address}");
    greynoise_get_request(client, api_key, &api_url).await
}

async fn ip_similarity_lookup(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "IP_SIMILARITY_LOOKUP",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");
    let limit = get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "IP_SIMILARITY_LOOKUP",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let minimum_score = get_number_parameter(
        "MINIMUM_SCORE",
        INTEGRATION,
        "IP_SIMILARITY_LOOKUP",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut api_url = format!("https://api.greynoise.io/v3/similarity/ips/{ip_address}");

    let mut query_params = Vec::new();
    if let Some(l) = limit {
        query_params.push(format!("limit={}", l));
    }
    if let Some(ms) = minimum_score {
        query_params.push(format!("minimum_score={}", ms));
    }

    if !query_params.is_empty() {
        api_url.push_str(&format!("?{}", query_params.join("&")));
    }

    greynoise_get_request(client, api_key, &api_url).await
}

async fn ip_timeline_daily_summary(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "IP_TIMELINE_DAILY_SUMMARY",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");
    let days = get_number_parameter(
        "DAYS",
        INTEGRATION,
        "IP_TIMELINE_DAILY_SUMMARY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let cursor = get_string_parameter(
        "CURSOR",
        INTEGRATION,
        "IP_TIMELINE_DAILY_SUMMARY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let limit = get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "IP_TIMELINE_DAILY_SUMMARY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut api_url = format!("https://api.greynoise.io/v3/noise/ips/{ip_address}/daily-summary");

    let mut query_params = Vec::new();
    if let Some(d) = days {
        query_params.push(format!("days={}", d));
    }
    if let Some(c) = cursor {
        query_params.push(format!("cursor={}", c));
    }
    if let Some(l) = limit {
        query_params.push(format!("limit={}", l));
    }

    if !query_params.is_empty() {
        api_url.push_str(&format!("?{}", query_params.join("&")));
    }

    greynoise_get_request(client, api_key, &api_url).await
}

async fn ip_timeline_hourly_summary(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let ip_address = get_string_parameter(
        "IP_ADDRESS",
        INTEGRATION,
        "IP_TIMELINE_HOURLY_SUMMARY",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("IP_ADDRESS is required");

    let days = get_number_parameter(
        "DAYS",
        INTEGRATION,
        "IP_TIMELINE_HOURLY_SUMMARY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let cursor = get_string_parameter(
        "CURSOR",
        INTEGRATION,
        "IP_TIMELINE_HOURLY_SUMMARY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let limit = get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "IP_TIMELINE_HOURLY_SUMMARY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut api_url = format!("https://api.greynoise.io/v3/noise/ips/{ip_address}/hourly-summary");

    let mut query_params = Vec::new();
    if let Some(d) = days {
        query_params.push(format!("days={}", d));
    }
    if let Some(c) = cursor {
        query_params.push(format!("cursor={}", c));
    }
    if let Some(l) = limit {
        query_params.push(format!("limit={}", l));
    }

    if !query_params.is_empty() {
        api_url.push_str(&format!("?{}", query_params.join("&")));
    }

    greynoise_get_request(client, api_key, &api_url).await
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
                secret: "{\"API_KEY\": \"some-api-token\"}".to_string(),
                credential_type: Some("GREY_NOISE".to_string()),
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
    async fn test_ip_quick_check() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "IP_ADDRESS".to_string() => json!("1.1.1.1") };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_QUICK_CHECK",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("ip").unwrap(), "1.1.1.1");
    }

    #[tokio::test]
    async fn test_ip_context() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "IP_ADDRESS".to_string() => json!("1.1.1.1") };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_CONTEXT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("ip").unwrap(), "1.1.1.1");
    }

    #[tokio::test]
    async fn test_riot_ip_lookup() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "IP_ADDRESS".to_string() => json!("1.1.1.1") };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "RIOT_IP_LOOKUP",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("ip").unwrap(), "1.1.1.1");
    }

    #[tokio::test]
    async fn test_ip_similarity_lookup() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! {
            "IP_ADDRESS".to_string() => json!("1.1.1.1"),
            "LIMIT".to_string() => json!(50),
            "MINIMUM_SCORE".to_string() => json!(0.85)
        };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_SIMILARITY_LOOKUP",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("ip").unwrap(), "1.1.1.1");
    }

    #[tokio::test]
    async fn test_ip_timeline_daily_summary() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! {
            "IP_ADDRESS".to_string() => json!("1.1.1.1"),
            "DAYS".to_string() => json!(1),
            "CURSOR".to_string() => json!("b2Zmc2V0PTUw"),
            "LIMIT".to_string() => json!(50)
        };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_TIMELINE_DAILY_SUMMARY",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("ip").unwrap(), "1.1.1.1");
    }

    #[tokio::test]
    async fn test_ip_timeline_hourly_summary() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! {
            "IP_ADDRESS".to_string() => json!("1.1.1.1"),
            "DAYS".to_string() => json!(1),
            "CURSOR".to_string() => json!("b2Zmc2V0PTUw"),
            "LIMIT".to_string() => json!(50),
        };

        let result = GreyNoiseExecutor
            .execute(
                &*client,
                &context,
                "IP_TIMELINE_HOURLY_SUMMARY",
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
            "Missing credentials: \"credentials\""
        );
    }
}
