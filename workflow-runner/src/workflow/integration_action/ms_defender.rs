use super::IntegrationExecutor;
use crate::workflow::{
    context::Context,
    http_client::{HttpClient, RequestBodyType},
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
            "GET_ALERT" => get_alert(client, context, credential_name, parameters).await,
            "UPDATE_ALERT_STATUS" => {
                update_alert(client, context, credential_name, parameters).await
            }
            "CREATE_COMMENT_FOR_ALERT" => {
                create_comment_for_alert(client, context, credential_name, parameters).await
            }
            "LIST_INCIDENTS" => list_incidents(client, context, credential_name, parameters).await,
            "GET_INCIDENT" => get_incident(client, context, credential_name, parameters).await,
            /** "UPDATE_INCIDENT" => {
                update_incident(client, context, credential_name, parameters).await
            } */
            "CREATE_COMMENT_FOR_INCIDENT" => {
                create_comment_for_incident(client, context, credential_name, parameters).await
            }
            // "RUN_HUNTING_QUERY" => run_hunting_query(client, context, credential_name, parameters).await,
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
            format!("Error: Failed to call {INTEGRATION} List Alerts API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/security-alert-get?view=graph-rest-1.0&tabs=http
async fn get_alert(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let alert_id = get_string_parameter(
        "ALERT_ID",
        INTEGRATION,
        "GET_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("ALERT_ID is required");

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/security/alerts_v2/{}",
        alert_id
    );

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            HashMap::new(),
            200,
            format!("Error: Failed to call {INTEGRATION} Get Alert API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/security-alert-update?view=graph-rest-1.0&tabs=http
async fn update_alert(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let alert_id = get_string_parameter(
        "ALERT_ID",
        INTEGRATION,
        "UPDATE_ALERT_STATUS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("ALERT_ID is required");

    let status = get_string_parameter(
        "STATUS",
        INTEGRATION,
        "UPDATE_ALERT_STATUS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let classification = get_string_parameter(
        "CLASSIFICATION",
        INTEGRATION,
        "UPDATE_ALERT_STATUS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let determination = get_string_parameter(
        "DETERMINATION",
        INTEGRATION,
        "UPDATE_ALERT_STATUS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let assigned_to = get_string_parameter(
        "ASSIGNED_TO",
        INTEGRATION,
        "UPDATE_ALERT_STATUS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut body = HashMap::new();
    if let Some(status) = status {
        body.insert("status", serde_json::Value::String(status));
    }
    if let Some(classification) = classification {
        body.insert("classification", serde_json::Value::String(classification));
    }
    if let Some(determination) = determination {
        body.insert("determination", serde_json::Value::String(determination));
    }
    if let Some(assigned_to) = assigned_to {
        body.insert("assignedTo", serde_json::Value::String(assigned_to));
    }

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/security/alerts_v2/{}",
        alert_id
    );

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            HashMap::new(),
            200,
            format!("Error: Failed to call {INTEGRATION} API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/security-alert-post-comments?view=graph-rest-1.0&tabs=http
async fn create_comment_for_alert(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let alert_id = get_string_parameter(
        "ALERT_ID",
        INTEGRATION,
        "CREATE_COMMENT_FOR_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("ALERT_ID is required");

    let comment = get_string_parameter(
        "COMMENT",
        INTEGRATION,
        "CREATE_COMMENT_FOR_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("COMMENT is required");

    let api_url =
        format!("https://graph.microsoft.com/v1.0/security/alerts_v2/{alert_id}/comments");

    let body = serde_json::json!({
        "@odata.type": "#microsoft.graph.security.alertComment",
        "comment": comment
    });

    client
        .post_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            HashMap::new(),
            RequestBodyType::Json { body },
            200,
            format!("Error: Failed to call {INTEGRATION} Create Comment for Alert API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/security-list-incidents?view=graph-rest-1.0&tabs=http
async fn list_incidents(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    let filter_opt = get_string_parameter(
        "FILTER",
        INTEGRATION,
        "LIST_INCIDENTS",
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
        "LIST_INCIDENTS",
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
        "LIST_INCIDENTS",
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
        "LIST_INCIDENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;
    let do_count = count_opt.is_some() && count_opt.unwrap();

    let mut api_url = if do_count {
        "https://graph.microsoft.com/v1.0/security/incidents/$count".to_string()
    } else {
        "https://graph.microsoft.com/v1.0/security/incidents".to_string()
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
            format!("Error: Failed to call {INTEGRATION} List Incidents API"),
        )
        .await
}

// https://learn.microsoft.com/en-us/graph/api/security-incident-get?view=graph-rest-1.0&tabs=http
async fn get_incident(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let incident_id = get_string_parameter(
        "INCIDENT_ID",
        INTEGRATION,
        "GET_INCIDENT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("INCIDENT_ID is required");

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/security/incidents/{}",
        incident_id
    );

    client
        .get_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            HashMap::new(),
            200,
            format!("Error: Failed to call {INTEGRATION} Get Incident API"),
        )
        .await
}

// TODO: Implement patch_with_oauth_refresh()
// TODO: Handle ARRAY input
/**
// https://learn.microsoft.com/en-us/graph/api/security-incident-update?view=graph-rest-1.0&tabs=http
async fn update_incident(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let incident_id = get_string_parameter(
        "INCIDENT_ID",
        INTEGRATION,
        "UPDATE_INCIDENT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("INCIDENT_ID is required");

    let assigned_to = get_string_parameter(
        "ASSIGNED_TO",
        INTEGRATION,
        "UPDATE_INCIDENT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let classification = get_string_parameter(
        "CLASSIFICATION",
        INTEGRATION,
        "UPDATE_INCIDENT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let determination = get_string_parameter(
        "DETERMINATION",
        INTEGRATION,
        "UPDATE_INCIDENT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let status = get_string_parameter(
        "STATUS",
        INTEGRATION,
        "UPDATE_INCIDENT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let custom_tags = get_string_parameter(
        "CUSTOM_TAGS",
        INTEGRATION,
        "UPDATE_INCIDENT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut body = HashMap::new();
    if let Some(assigned_to) = assigned_to {
        body.insert("assignedTo", serde_json::Value::String(assigned_to));
    }
    if let Some(classification) = classification {
        body.insert("classification", serde_json::Value::String(classification));
    }
    if let Some(determination) = determination {
        body.insert("determination", serde_json::Value::String(determination));
    }
    if let Some(status) = status {
        body.insert("status", serde_json::Value::String(status));
    }
    if let Some(custom_tags) = custom_tags {
        body.insert("customTags", serde_json::Value::String(custom_tags));
    }

    let api_url = format!(
        "https://graph.microsoft.com/v1.0/security/incidents/{}",
        incident_id
    );

    client
        .patch_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            body,
            200,
            format!("Error: Failed to call {INTEGRATION} Update Incident API"),
        )
        .await
}*/

// https://learn.microsoft.com/en-us/graph/api/security-incident-post-comments?view=graph-rest-1.0&tabs=http
async fn create_comment_for_incident(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let incident_id = get_string_parameter(
        "INCIDENT_ID",
        INTEGRATION,
        "CREATE_COMMENT_FOR_INCIDENT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("INCIDENT_ID is required");

    let comment = get_string_parameter(
        "COMMENT",
        INTEGRATION,
        "CREATE_COMMENT_FOR_INCIDENT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("COMMENT is required");

    let api_url =
        format!("https://graph.microsoft.com/v1.0/security/incidents/{incident_id}/comments");

    let body = serde_json::json!({
        "@odata.type": "#microsoft.graph.security.alertComment",
        "comment": comment
    });

    client
        .post_with_oauth_refresh(
            context,
            &api_url,
            credential_name,
            HashMap::new(),
            RequestBodyType::Json { body },
            200,
            format!("Error: Failed to call {INTEGRATION} Create Comment for Incident API"),
        )
        .await
}

// TODO: fix post_with_oauth_refresh parameters
/*
// https://learn.microsoft.com/en-us/graph/api/security-security-runhuntingquery?view=graph-rest-1.0&tabs=http
async fn run_hunting_query(
    client: &dyn HttpClient,
    context: &Context,
    credential_name: &str,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let query = get_string_parameter(
        "QUERY",
        INTEGRATION,
        "RUN_HUNTING_QUERY",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("QUERY is required");

    let timespan = get_string_parameter(
        "TIMESPAN",
        INTEGRATION,
        "RUN_HUNTING_QUERY",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let mut body = serde_json::Map::new();
    body.insert("Query".to_string(), serde_json::Value::String(query));

    if let Some(timespan) = timespan {
        body.insert("Timespan".to_string(), serde_json::Value::String(timespan));
    }

    let api_url = "https://graph.microsoft.com/v1.0/security/runHuntingQuery";

    client
        .post_with_oauth_refresh(
            context,
            api_url,
            credential_name,
            HashMap::new(),
            RequestBodyType::Json(serde_json::Value::Object(body)),
            200,
            format!("Error: Failed to call {INTEGRATION} Run Hunting Query API"),
        )
        .await
}
*/

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
            if url.contains("/comments") {
                Ok(json!({
                    "value": [url],
                    "body": {
                        "@odata.type": "#microsoft.graph.security.alertComment",
                        "comment": "This is a test comment"
                    }
                }))
            } else {
                Ok(json!({
                    "value": [url]
                }))
            }
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

    #[tokio::test]
    async fn test_get_alert() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "ALERT_ID".to_string() => json!("12345")
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "GET_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"value": ["https://graph.microsoft.com/v1.0/security/alerts_v2/12345"]})
        );
    }
    #[tokio::test]
    async fn test_update_alert() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "ALERT_ID".to_string() => json!("12345"),
            "STATUS".to_string() => json!("inProgress"),
            "CLASSIFICATION".to_string() => json!("falsePositive"),
            "DETERMINATION".to_string() => json!("phishing"),
            "ASSIGNED_TO".to_string() => json!("anotheruser@example.com")
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "UPDATE_ALERT_STATUS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"value": ["https://graph.microsoft.com/v1.0/security/alerts_v2/12345"]})
        );
    }

    #[tokio::test]
    async fn test_create_comment_for_alert() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "ALERT_ID".to_string() => json!("alert-123"),
            "COMMENT".to_string() => json!("This is a test comment")
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "CREATE_COMMENT_FOR_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({
                "value": ["https://graph.microsoft.com/v1.0/security/alerts_v2/alert-123/comments"],
                "body": {
                    "@odata.type": "#microsoft.graph.security.alertComment",
                    "comment": "This is a test comment"
                }
            })
        );
    }
    #[tokio::test]
    async fn test_list_incidents() {
        {
            let (client, context) = setup().await;
            let parameters = HashMap::new();
            let result = MsDefenderExecutor
                .execute(
                    &*client,
                    &context,
                    "LIST_INCIDENTS",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://graph.microsoft.com/v1.0/security/incidents"]})
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
                    "LIST_INCIDENTS",
                    &Some("credentials".to_string()),
                    &parameters,
                )
                .await;
            assert!(result.is_ok());
            let value = result.unwrap();
            assert_eq!(
                value,
                json!({"value": ["https://graph.microsoft.com/v1.0/security/incidents/$count?$filter=createdDateTime gt 2024-05-01T00:00:00Z&$top=10&$skip=5"]})
            );
        }
    }

    #[tokio::test]
    async fn test_get_incident() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "INCIDENT_ID".to_string() => json!("incident-123")
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "GET_INCIDENT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"value": ["https://graph.microsoft.com/v1.0/security/incidents/incident-123"]})
        );
    }

    #[tokio::test]
    async fn test_update_incident() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "INCIDENT_ID".to_string() => json!("incident-123"),
            "ASSIGNED_TO".to_string() => json!("user@example.com"),
            "CLASSIFICATION".to_string() => json!("truePositive"),
            "DETERMINATION".to_string() => json!("malware"),
            "STATUS".to_string() => json!("active"),
            "CUSTOM_TAGS".to_string() => json!(["tag1", "tag2"])
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "UPDATE_INCIDENT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({
                "value": ["https://graph.microsoft.com/v1.0/security/incidents/incident-123"],
                "body": {
                    "assignedTo": "user@example.com",
                    "classification": "truePositive",
                    "determination": "malware",
                    "status": "active",
                    "customTags": ["tag1", "tag2"]
                }
            })
        );
    }

    #[tokio::test]
    async fn test_create_comment_for_incident() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "INCIDENT_ID".to_string() => json!("incident-123"),
            "COMMENT".to_string() => json!("This is a test comment")
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "CREATE_COMMENT_FOR_INCIDENT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({
                "value": ["https://graph.microsoft.com/v1.0/security/incidents/incident-123/comments"],
                "body": {
                    "@odata.type": "#microsoft.graph.security.alertComment",
                    "comment": "This is a test comment"
                }
            })
        );
    }

    #[tokio::test]
    async fn test_run_hunting_query() {
        let (client, context) = setup().await;

        let parameters = hashmap! {
            "QUERY".to_string() => json!("DeviceNetworkEvents | where Timestamp > ago(1d) | where RemoteIP == '192.168.1.1'"),
            "TIMESPAN".to_string() => json!("P7D")
        };

        let result = MsDefenderExecutor
            .execute(
                &*client,
                &context,
                "RUN_HUNTING_QUERY",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());

        let value = result.unwrap();
        assert_eq!(
            value,
            json!({
                "value": ["https://graph.microsoft.com/v1.0/security/runHuntingQuery"],
                "body": {
                    "Query": "DeviceNetworkEvents | where Timestamp > ago(1d) | where RemoteIP == '192.168.1.1'",
                    "Timespan": "P7D"
                }
            })
        );
    }
}
