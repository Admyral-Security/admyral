use super::IntegrationExecutor;
use crate::workflow::context;
use crate::workflow::{
    http_client::{HttpClient, RequestBodyType},
    utils::{get_bool_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const PHISH_REPORT: &str = "Phish Report";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct PhishReportCredential {
    api_key: String,
}

async fn fetch_api_key(credential_name: &str, context: &context::Context) -> Result<String> {
    let credential_secret = context
        .db
        .fetch_secret(&context.workflow_id, credential_name)
        .await?;
    let credential = match credential_secret {
        None => {
            let error_message = format!("Missing credentials for {PHISH_REPORT}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => serde_json::from_str::<PhishReportCredential>(&secret)?,
    };
    Ok(credential.api_key)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PhishReportExecutor;

impl IntegrationExecutor for PhishReportExecutor {
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
            "GET_HOSTING_CONTACT_INFORMATION" => {
                get_hosting_contact_information(client, &api_key, context, parameters).await
            }
            "LIST_TAKEDOWNS" => list_takedowns(client, &api_key).await,
            "START_TAKEDOWN" => start_takedown(client, &api_key, context, parameters).await,
            "GET_TAKEDOWN" => get_takedown(client, &api_key, context, parameters).await,
            "CLOSE_TAKEDOWN_CASE" => close_takedown(client, &api_key, context, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {PHISH_REPORT}.")),
        }
    }
}

#[derive(Debug, Clone)]
enum HttpRequest {
    Get,
    Post { body: serde_json::Value },
    Put { body: serde_json::Value },
}

async fn phish_report_request(
    client: &dyn HttpClient,
    api_key: &str,
    api_url: &str,
    http_request: HttpRequest,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Authorization".to_string() => format!("Bearer {}", api_key)
    };

    let response = match http_request {
        HttpRequest::Get => {
            client
                .get(
                    api_url,
                    headers,
                    200,
                    format!("Error: Failed to call {PHISH_REPORT} API"),
                )
                .await?
        }
        HttpRequest::Post { body } => {
            client
                .post(
                    api_url,
                    headers,
                    RequestBodyType::Json { body: body },
                    200,
                    format!("Error: Failed to call {PHISH_REPORT} API"),
                )
                .await?
        }
        HttpRequest::Put { body } => {
            client
                .put(
                    api_url,
                    headers,
                    RequestBodyType::Json { body: body },
                    200,
                    format!("Error: Failed to call {PHISH_REPORT} API"),
                )
                .await?
        }
    };

    Ok(response)
}

// https://phish.report/api/v0#tag/Analysis/paths/~1api~1v0~1hosting/get
async fn get_hosting_contact_information(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        PHISH_REPORT,
        "GET_HOSTING_CONTACT_INFORMATION",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is required");
    let api_url = format!("https://phish.report/api/v0/hosting?url={url}");
    phish_report_request(client, api_key, &api_url, HttpRequest::Get).await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases/get
async fn list_takedowns(client: &dyn HttpClient, api_key: &str) -> Result<serde_json::Value> {
    let api_url = "https://phish.report/api/v0/cases";
    phish_report_request(client, api_key, &api_url, HttpRequest::Get).await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases/post
async fn start_takedown(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let url = get_string_parameter(
        "url",
        PHISH_REPORT,
        "START_TAKEDOWN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("url is a required parameter");

    let ignore_duplicates = get_bool_parameter(
        "ignore_duplicates",
        PHISH_REPORT,
        "START_TAKEDOWN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let body = match ignore_duplicates {
        Some(ignore_duplicates) => {
            json!({
                "ignore_duplicates": ignore_duplicates,
                "url": url
            })
        }
        None => json!({"url": url}),
    };

    let api_url = "https://phish.report/api/v0/cases";

    phish_report_request(client, api_key, &api_url, HttpRequest::Post { body }).await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases~1%7Bid%7D/get
async fn get_takedown(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let case_id = get_string_parameter(
        "id",
        PHISH_REPORT,
        "GET_TAKEDOWN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("id is a required parameter");

    let api_url = format!("https://phish.report/api/v0/cases/{case_id}");
    phish_report_request(client, api_key, &api_url, HttpRequest::Get).await
}

// https://phish.report/api/v0#tag/Takedown/paths/~1api~1v0~1cases~1%7Bid%7D~1close/put
async fn close_takedown(
    client: &dyn HttpClient,
    api_key: &str,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let case_id = get_string_parameter(
        "id",
        PHISH_REPORT,
        "GET_TAKEDOWN",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("id is a required parameter");
    let comment = get_string_parameter(
        "comment",
        PHISH_REPORT,
        "GET_TAKEDOWN",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let body = match comment {
        None => json!({}),
        Some(comment) => {
            if comment.is_empty() {
                json!({})
            } else {
                json!({"comment": comment})
            }
        }
    };

    let api_url = format!("https://phish.report/api/v0/cases/{case_id}/close");
    phish_report_request(client, api_key, &api_url, HttpRequest::Put { body }).await
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

        async fn post(
            &self,
            _url: &str,
            _headers: HashMap<String, String>,
            _body: RequestBodyType,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({
                "domain": "admyral.ai"
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
    async fn test_missing_credential() {
        let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "GET_TAKEDOWN",
                "credentials",
                &HashMap::new(),
            )
            .await;
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Missing credentials for Phish Report."
        );
    }

    #[tokio::test]
    async fn test_get_hosting_contact_information() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "GET_HOSTING_CONTACT_INFORMATION",
                "credentials",
                &hashmap! {
                    "url".to_string() => json!("admyral.dev")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.dev" }));
    }

    #[tokio::test]
    async fn test_list_takedowns() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "LIST_TAKEDOWNS",
                "credentials",
                &HashMap::new(),
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.dev" }));
    }

    #[tokio::test]
    async fn test_start_takedown() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "START_TAKEDOWN",
                "credentials",
                &hashmap! {
                    "url".to_string() => json!("admyral.dev")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.ai" }));

        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "START_TAKEDOWN",
                "credentials",
                &hashmap! {
                    "url".to_string() => json!("admyral.dev"),
                    "ignore_duplicates".to_string() => json!(true)
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.ai" }));
    }

    #[tokio::test]
    async fn test_get_takedown() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "GET_TAKEDOWN",
                "credentials",
                &hashmap! {
                    "id".to_string() => json!("abcdef")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.dev" }));
    }

    #[tokio::test]
    async fn test_close_takedown() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "GET_TAKEDOWN",
                "credentials",
                &hashmap! {
                    "id".to_string() => json!("abcdef")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.dev" }));

        let (client, context) = setup(Arc::new(MockDb)).await;
        let result = PhishReportExecutor
            .execute(
                &*client,
                &context,
                "GET_TAKEDOWN",
                "credentials",
                &hashmap! {
                    "id".to_string() => json!("abcdef"),
                    "comment".to_string() => json!("this is a comment")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "domain": "admyral.dev" }));
    }
}
