use super::IntegrationExecutor;
use crate::workflow::{
    context::Context,
    http_client::HttpClient,
    utils::{get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const INTEGRATION: &str = "Microsoft Defender for Cloud";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MsDefenderForCloudExecutor;

impl IntegrationExecutor for MsDefenderForCloudExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        match api {
            "LIST_ALERTS" => list_alerts(client, context, credential_name, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

// Alerts - List https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list?view=rest-defenderforcloud-2022-01-01&tabs=HTTP
// Alerts - List By Resource Group https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list-by-resource-group?view=rest-defenderforcloud-2022-01-01&tabs=HTTP
// Alerts - List Resource Group Level By Region https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list-resource-group-level-by-region?view=rest-defenderforcloud-2022-01-01&tabs=HTTP
// Alerts - List Subscription Level By Region https://learn.microsoft.com/en-us/rest/api/defenderforcloud/alerts/list-subscription-level-by-region?view=rest-defenderforcloud-2022-01-01&tabs=HTTP
async fn list_alerts(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let subscription_id = get_string_parameter(
        "SUBSCRIPTION_ID",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("subscription id is a required parameter!");

    let resource_group_opt = get_string_parameter(
        "RESOURCE_GROUP",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let asc_location_opt = get_string_parameter(
        "ASC_LOCATION",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let page_limit = match get_number_parameter(
        "PAGE_LIMIT",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        Some(page_limit) => page_limit
            .as_u64()
            .expect("page_limit must be an unsigned number"),
        None => 1,
    };

    let api_version = "2022-01-01";

    let mut api_url = match (resource_group_opt, asc_location_opt) {
        (None, None) => {
            format!("https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/alerts?api-version={api_version}")
        }
        (Some(resource_group), None) => {
            format!("https://management.azure.com/subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.Security/alerts?api-version={api_version}")
        }
        (None, Some(asc_location)) => {
            format!("https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/locations/{asc_location}/alerts?api-version={api_version}")
        }
        (Some(resource_group), Some(asc_location)) => {
            format!("https://management.azure.com/subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.Security/locations/{asc_location}/alerts?api-version={api_version}")
        }
    };

    // Handle pagination
    let mut all_alerts = Vec::new();
    for _ in 0..page_limit {
        let result = client
            .get_with_oauth_refresh(
                context,
                &api_url,
                credential_name,
                HashMap::new(),
                200,
                format!("Error: Failed to call {INTEGRATION} List Alerts API"),
            )
            .await?;

        let alerts = result
            .get("value")
            .expect("response must have value parameter")
            .as_array()
            .expect("value must be an array")
            .clone();
        tracing::info!(
            "Fetched {} alerts from Microsoft Defender for Cloud.",
            alerts.len()
        );
        all_alerts.extend(alerts.into_iter());

        match result.get("nextLink") {
            None => break,
            Some(next_link) => {
                api_url = next_link
                    .as_str()
                    .expect("nextLink must be a string")
                    .to_string()
            }
        };
    }

    tracing::info!(
        "Fetched {} alerts from Microsoft Defender for Cloud in total.",
        all_alerts.len()
    );

    Ok(json!({
        "value": all_alerts
    }))
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
    async fn test_list_alerts() {
        {
            let (client, context) = setup().await;
            let parameters = hashmap! {
                "SUBSCRIPTION_ID".to_string() => json!("some-subscription-id"),
            };
            let result = MsDefenderForCloudExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_ALERTS",
                    "credentials",
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://management.azure.com/subscriptions/some-subscription-id/providers/Microsoft.Security/alerts?api-version=2022-01-01"]})
            );
        }

        {
            let (client, context) = setup().await;
            let parameters = hashmap! {
                "SUBSCRIPTION_ID".to_string() => json!("some-subscription-id"),
                "RESOURCE_GROUP".to_string() => json!("myRg1"),
            };
            let result = MsDefenderForCloudExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_ALERTS",
                    "credentials",
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://management.azure.com/subscriptions/some-subscription-id/resourceGroups/myRg1/providers/Microsoft.Security/alerts?api-version=2022-01-01"]})
            );
        }

        {
            let (client, context) = setup().await;
            let parameters = hashmap! {
                "SUBSCRIPTION_ID".to_string() => json!("some-subscription-id"),
                "ASC_LOCATION".to_string() => json!("westeurope"),
            };
            let result = MsDefenderForCloudExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_ALERTS",
                    "credentials",
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://management.azure.com/subscriptions/some-subscription-id/providers/Microsoft.Security/locations/westeurope/alerts?api-version=2022-01-01"]})
            );
        }

        {
            let (client, context) = setup().await;
            let parameters = hashmap! {
                "SUBSCRIPTION_ID".to_string() => json!("some-subscription-id"),
                "RESOURCE_GROUP".to_string() => json!("myRg1"),
                "ASC_LOCATION".to_string() => json!("westeurope"),
            };
            let result = MsDefenderForCloudExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_ALERTS",
                    "credentials",
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://management.azure.com/subscriptions/some-subscription-id/resourceGroups/myRg1/providers/Microsoft.Security/locations/westeurope/alerts?api-version=2022-01-01"]})
            );
        }
    }
}
