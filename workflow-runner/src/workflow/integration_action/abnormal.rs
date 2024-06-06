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

const INTEGRATION: &str = "Abnormal";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct AbnormalCredential {
    api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AbnormalExecutor;

impl IntegrationExecutor for AbnormalExecutor {
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
            .fetch_secret::<AbnormalCredential>(credential_name, &context.workflow_id)
            .await?
            .api_key;
        match api {
            "GET_CASE_ANALYSIS" => get_case_analysis(client, &api_key, context, parameters).await,
            "GET_CASE" => get_case(client, &api_key, context, parameters).await,
            "GET_THREAT_ATTACHMENTS" => {
                get_threat_attachments(client, &api_key, context, parameters).await
            }
            "GET_THREAT_LINKS" => get_threat_links(client, &api_key, context, parameters).await,
            "GET_THREAT" => get_threat(client, &api_key, context, parameters).await,
            "LIST_CASES" => list_cases(client, &api_key, context, parameters).await,
            "LIST_THREATS" => list_threats(client, &api_key, context, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

// TODO: add retry, timeout
async fn abnormal_get_request(
    client: &dyn HttpClient,
    api_key: &str,
    api_url: &str,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Authorization".to_string() => format!("Bearer {}", api_key),
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

async fn get_case_analysis(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let case_id = get_string_parameter(
        "CASE_ID",
        INTEGRATION,
        "GET_CASE_ANALYSIS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("CASE_ID is required");
    let api_url = format!("https://api.abnormalplatform.com/v1/cases/{case_id}/analysis");
    abnormal_get_request(client, api_key, &api_url).await
}

async fn get_case(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let case_id = get_string_parameter(
        "CASE_ID",
        INTEGRATION,
        "GET_CASE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("CASE_ID is required");
    let api_url = format!("https://api.abnormalplatform.com/v1/cases/{case_id}");
    abnormal_get_request(client, api_key, &api_url).await
}

async fn get_threat_attachments(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let threat_id = get_string_parameter(
        "THREAT_ID",
        INTEGRATION,
        "GET_THREAT_ATTACHMENTS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("THREAT_ID is required");
    let api_url = format!("https://api.abnormalplatform.com/v1/threats/{threat_id}/attachments");
    abnormal_get_request(client, api_key, &api_url).await
}

async fn get_threat_links(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let threat_id = get_string_parameter(
        "THREAT_ID",
        INTEGRATION,
        "GET_THREAT_LINKS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("THREAT_ID is required");
    let api_url = format!("https://api.abnormalplatform.com/v1/threats/{threat_id}/links");
    abnormal_get_request(client, api_key, &api_url).await
}

async fn get_threat(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let threat_id = get_string_parameter(
        "THREAT_ID",
        INTEGRATION,
        "GET_THREAT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("THREAT_ID is required");
    let api_url = format!("https://api.abnormalplatform.com/v1/threats/{threat_id}");
    abnormal_get_request(client, api_key, &api_url).await
}

async fn list_cases(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let filter = get_string_parameter(
        "FILTER",
        INTEGRATION,
        "LIST_CASES",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    .expect("FILTER is required");
    let api_url = format!(
        "https://api.abnormalplatform.com/v1/cases?filter={}",
        filter
    );
    abnormal_get_request(client, api_key, &api_url).await
}

async fn list_threats(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let attack_type = get_string_parameter(
        "ATTACK_TYPE",
        INTEGRATION,
        "LIST_THREATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let recipient = get_string_parameter(
        "RECIPIENT",
        INTEGRATION,
        "LIST_THREATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let sender = get_string_parameter(
        "SENDER",
        INTEGRATION,
        "LIST_THREATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let subject = get_string_parameter(
        "SUBJECT",
        INTEGRATION,
        "LIST_THREATS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut api_url = String::from("https://api.abnormalplatform.com/v1/threats?");

    let mut query_params = Vec::new();
    if let Some(at) = attack_type {
        query_params.push(format!("attackType={}", at));
    }
    if let Some(rc) = recipient {
        query_params.push(format!("recipient={}", rc));
    }
    if let Some(sd) = sender {
        query_params.push(format!("sender={}", sd));
    }
    if let Some(sb) = subject {
        query_params.push(format!("subject={}", sb));
    }

    if !query_params.is_empty() {
        api_url.push_str(&query_params.join("&"));
    }

    abnormal_get_request(client, api_key, &api_url).await
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
                "case_id": "12345",
                "analysis": "sample analysis data",
                "details": "sample case details",
                "links": ["link1", "link2"],
                "threat_id": "abc123",
                "cases": ["case1", "case2"]
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
                credential_type: Some("ABNORMAL".to_string()),
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
    async fn test_get_case_analysis() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "CASE_ID".to_string() => json!("12345") };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "GET_CASE_ANALYSIS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("case_id").unwrap(), "12345");
        assert!(value.as_object().unwrap().get("analysis").is_some());
    }

    #[tokio::test]
    async fn test_missing_credential() {
        let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "GET_CASE_ANALYSIS",
                &Some("credentials".to_string()),
                &HashMap::new(),
            )
            .await;
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Error: Missing credential for Abnormal"
        );
    }

    #[tokio::test]
    async fn test_get_case() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "CASE_ID".to_string() => json!("12345") };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "GET_CASE",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(value.as_object().unwrap().get("case_id").unwrap(), "12345");
        assert!(value.as_object().unwrap().get("details").is_some());
    }

    #[tokio::test]
    async fn test_get_threat_attachments() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "THREAT_ID".to_string() => json!("abc123") };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "GET_THREAT_ATTACHMENTS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value.as_object().unwrap().get("threat_id").unwrap(),
            "abc123"
        );
    }

    #[tokio::test]
    async fn test_get_threat_links() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "THREAT_ID".to_string() => json!("abc123") };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "GET_THREAT_LINKS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value.as_object().unwrap().get("threat_id").unwrap(),
            "abc123"
        );
        assert!(value.as_object().unwrap().get("links").is_some());
    }

    #[tokio::test]
    async fn test_get_threat() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! { "THREAT_ID".to_string() => json!("abc123") };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "GET_THREAT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value.as_object().unwrap().get("threat_id").unwrap(),
            "abc123"
        );
        assert!(value.as_object().unwrap().get("details").is_some());
    }

    #[tokio::test]
    async fn test_list_cases() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters =
            hashmap! { "FILTER".to_string() => json!("receivedTime gte 2023-06-01T00:00:00Z") };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "LIST_CASES",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert!(value.as_object().unwrap().get("cases").is_some());
    }

    #[tokio::test]
    async fn test_list_threats() {
        let (client, context) = setup(Arc::new(MockDb)).await;

        let parameters = hashmap! {
            "ATTACK_TYPE".to_string() => json!("Phishing"),
            "RECIPIENT".to_string() => json!("user@example.com"),
            "SENDER".to_string() => json!("attacker@example.com"),
            "SUBJECT".to_string() => json!("Important")
        };

        let result = AbnormalExecutor
            .execute(
                &*client,
                &context,
                "LIST_THREATS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert!(value.as_object().unwrap().get("threats").is_some());
    }
}
