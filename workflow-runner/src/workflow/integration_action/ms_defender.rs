use super::IntegrationExecutor;
use crate::workflow::{
    context::Context,
    http_client::HttpClient,
    utils::{get_bool_parameter, get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const INTEGRATION: &str = "Microsoft Defender";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MsDefenderExecutor;

impl IntegrationExecutor for MsDefenderExecutor {
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
            "LIST_ALERTS_V2" => list_alerts_v2(client, context, credential_name, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

// https://learn.microsoft.com/en-us/graph/api/security-list-alerts_v2?view=graph-rest-1.0&tabs=http
async fn list_alerts_v2(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    let filter_opt = get_string_parameter(
        "FILTER",
        INTEGRATION,
        "LIST_ALERTS_V2",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    if let Some(filter) = filter_opt {
        query_params.push(format!("$filter={filter}"));
    }

    let limit_opt = get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "LIST_ALERTS_V2",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    if let Some(limit) = limit_opt {
        let limit = limit.as_u64().expect("limit must be an unsigned integer");
        query_params.push(format!("$top={limit}"));
    }

    let skip_opt = get_number_parameter(
        "SKIP",
        INTEGRATION,
        "LIST_ALERTS_V2",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    if let Some(skip) = skip_opt {
        let skip = skip.as_u64().expect("skip must be an unsigned integer");
        query_params.push(format!("$skip={skip}"));
    }

    let count_opt = get_bool_parameter(
        "COUNT",
        INTEGRATION,
        "LIST_ALERTS_V2",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let do_count = count_opt.is_some() && count_opt.unwrap();

    let mut api_url = if do_count {
        "https://graph.microsoft.com/v1.0/security/alerts_v2/$count".to_string()
    } else {
        "https://graph.microsoft.com/v1.0/security/alerts_v2".to_string()
    };

    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            HashMap::new(),
            200,
            format!("Error: Failed to call {INTEGRATION} Update Alert Status API"),
        )
        .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::Database;
    use async_trait::async_trait;
    use maplit::hashmap;
    use serde_json::json;
    use std::sync::Arc;

    struct MockHttpClient;
    #[async_trait]
    impl HttpClient for MockHttpClient {
        async fn get_with_oauth_refresh(
            &self,
            context: &Context,
            url: &str,
            oauth_token_name: &str,
            headers: HashMap<String, String>,
            expected_response_status: u16,
            error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(json!({
                "value": [url],
            }))
        }
    }

    struct MockDb;
    #[async_trait]
    impl Database for MockDb {}

    async fn setup() -> (Arc<MockHttpClient>, Context) {
        let client = Arc::new(MockHttpClient);
        let context = Context::init(
            "ddd54f25-0537-4e40-ab96-c93beee543de".to_string(),
            None,
            Arc::new(MockDb),
            client.clone(),
        )
        .await
        .unwrap();
        (client, context)
    }

    #[tokio::test]
    async fn test_list_alerts_v2() {
        {
            let (client, context) = setup().await;
            let parameters = HashMap::new();
            let result = MsDefenderExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_ALERTS_V2",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://graph.microsoft.com/v1.0/security/alerts_v2"]})
            );
        }

        {
            let (client, context) = setup().await;
            let parameters = hashmap! {
                "COUNT".to_string() => json!(true),
                "FILTER".to_string() => json!("createdDateTime gt 2024-05-01T00:00:00Z"),
                "LIMIT".to_string() => json!(10),
                "SKIP".to_string() => json!(5)
            };
            let result = MsDefenderExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_ALERTS_V2",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://graph.microsoft.com/v1.0/security/alerts_v2/$count?$filter=createdDateTime gt 2024-05-01T00:00:00Z&$top=10&$skip=5"]})
            );
        }
    }
}
