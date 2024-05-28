use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const JIRA: &str = "Jira";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct JiraCredential {
    domain: String,
    email: String,
    api_token: String,
}

async fn fetch_credential(
    credential_name: &str,
    context: &context::Context,
) -> Result<JiraCredential> {
    let credential_secret = context
        .db
        .fetch_secret(&context.workflow_id, credential_name)
        .await?;
    let credential = match credential_secret {
        None => {
            let error_message = format!("Missing credentials for {JIRA}.");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => match serde_json::from_str::<JiraCredential>(&secret) {
            Err(e) => {
                tracing::error!("Error parsing Jira credential: {e}");
                return Err(anyhow!("Received malformed Jira credential. Expecting the following structure: \"{{\"DOMAIN\": <string>, \"EMAIL\": <string>, \"API_TOKEN\": <string>}}\""));
            }
            Ok(credential) => credential,
        },
    };
    Ok(credential)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JiraExecutor;

impl IntegrationExecutor for JiraExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        credential_name: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        let credential = fetch_credential(credential_name, context).await?;
        match api {
            "CREATE_ISSUE" => create_issue(client, context, &credential, parameters).await,
            "ASSIGN_ISSUE" => assign_issue(client, context, &credential, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {JIRA}.")),
        }
    }
}

async fn jira_post_request(
    client: &dyn HttpClient,
    api_url: &str,
    credential: &JiraCredential,
    body: serde_json::Value,
) -> Result<serde_json::Value> {
    // API Key Construction: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
    let api_key = format!("{}:{}", credential.email, credential.api_token);
    let api_key_base64 = STANDARD.encode(api_key);

    let headers = hashmap! {
        "Authorization".to_string() => format!("Basic {api_key_base64}"),
        "Content-type".to_string() => "application/json".to_string(),
    };

    client
        .post(
            api_url,
            headers,
            RequestBodyType::Json { body },
            201,
            format!("Error: Failed to call {JIRA} API"),
        )
        .await
}

async fn jira_put_request(
    client: &dyn HttpClient,
    api_url: &str,
    credential: &JiraCredential,
    body: serde_json::Value,
) -> Result<serde_json::Value> {
    // API Key Construction: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
    let api_key = format!("{}:{}", credential.email, credential.api_token);
    let api_key_base64 = STANDARD.encode(api_key);

    let headers = hashmap! {
        "Authorization".to_string() => format!("Basic {api_key_base64}"),
        "Content-type".to_string() => "application/json".to_string(),
    };

    client
        .put(
            api_url,
            headers,
            RequestBodyType::Json { body },
            204,
            format!("Error: Failed to call {JIRA} API"),
        )
        .await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
async fn create_issue(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue",
        credential.domain
    );

    let summary = get_string_parameter(
        "summary",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("summary is a required parameter");

    let project_id = get_string_parameter(
        "project_id",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("project_id is a required parameter");

    let issue_type = get_string_parameter(
        "issue_type",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_type is a required parameter");

    let mut fields = hashmap! {
        "summary".to_string() => json!(summary),
        "project".to_string() => json!({"id": project_id}),
        "issuetype".to_string() => json!({"name": issue_type})
    };

    if let Some(description) = get_string_parameter(
        "description",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    {
        if !description.is_empty() {
            // Description must be in Atlassian Document Format
            // https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
            let value = match serde_json::from_str::<serde_json::Value>(&description) {
                Ok(description_as_json) => match description_as_json {
                    serde_json::Value::Object(obj) => json!(obj),
                    _ => {
                        return Err(anyhow!(
                        "Invalid input for \"Description\". Expected Atlassian Document Format."
                    ))
                    }
                },
                Err(_) => {
                    return Err(anyhow!(
                        "Invalid input for \"Description\". Expected Atlassian Document Format."
                    ))
                }
            };
            fields.insert("description".to_string(), value);
        }
    }

    if let Some(assignee) = get_string_parameter(
        "assignee",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    {
        if !assignee.is_empty() {
            fields.insert("assignee".to_string(), json!({"id": assignee}));
        }
    }

    if let Some(labels) = get_string_parameter(
        "labels",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    {
        let cleaned_labels = labels
            .split(",")
            .map(|label| label.trim())
            .collect::<Vec<&str>>();
        if !cleaned_labels.is_empty() {
            fields.insert("labels".to_string(), json!(cleaned_labels));
        }
    }

    if let Some(priority) = get_string_parameter(
        "priority",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    {
        if !priority.is_empty() {
            fields.insert("priority".to_string(), json!({"name": priority}));
        }
    }

    if let Some(custom_fields) = get_string_parameter(
        "custom_fields",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    {
        if !custom_fields.is_empty() {
            match serde_json::from_str::<serde_json::Value>(&custom_fields)? {
                serde_json::Value::Object(obj) => {
                    obj.into_iter().for_each(|(key, value)| {
                        fields.insert(key, value);
                    });
                }
                _ => {
                    return Err(anyhow!(
                        "Invalid input for \"Custom Fields\". Expected a JSON object."
                    ))
                }
            }
        }
    }

    if let Some(components) = get_string_parameter(
        "components",
        JIRA,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    {
        if !components.is_empty() {
            let value = serde_json::from_str::<serde_json::Value>(&components)?;
            fields.insert("components".to_string(), value);
        }
    }

    jira_post_request(client, &api_url, credential, json!({"fields": fields})).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-assignee-put
async fn assign_issue(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let issue_id_or_key = get_string_parameter(
        "issue_id_or_key",
        JIRA,
        "ASSIGN_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");
    let account_id = get_string_parameter(
        "account_id",
        JIRA,
        "ASSIGN_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("account_id is a required parameter");
    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue/{}/assignee",
        credential.domain, issue_id_or_key
    );
    jira_put_request(
        client,
        &api_url,
        credential,
        json!({"accountId": account_id}),
    )
    .await
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
                "ok": true,
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
            Ok(serde_json::json!({"ok": true}))
        }

        async fn put(
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
        ) -> Result<Option<String>> {
            Ok(Some("{\"API_TOKEN\": \"some-api-key\", \"DOMAIN\": \"test\", \"EMAIL\": \"chris@admyral.dev\"}".to_string()))
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

    struct MockDbMalformedSecret;
    #[async_trait]
    impl Database for MockDbMalformedSecret {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<String>> {
            Ok(Some("{\"API_TOKEN\": \"some-api-key\"}".to_string()))
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
        {
            let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
            let result = JiraExecutor
                .execute(
                    &*client,
                    &context,
                    "CREATE_ISSUE",
                    "credentials",
                    &HashMap::new(),
                )
                .await;
            assert!(result.is_err());
            assert_eq!(
                result.err().unwrap().to_string(),
                "Missing credentials for Jira."
            );
        }

        {
            let (client, context) = setup(Arc::new(MockDbMalformedSecret)).await;
            let result = JiraExecutor
                .execute(
                    &*client,
                    &context,
                    "CREATE_ISSUE",
                    "credentials",
                    &HashMap::new(),
                )
                .await;
            assert!(result.is_err());
            assert_eq!(
                result.err().unwrap().to_string(),
                "Received malformed Jira credential. Expecting the following structure: \"{\"DOMAIN\": <string>, \"EMAIL\": <string>, \"API_TOKEN\": <string>}\""
            );
        }
    }

    #[tokio::test]
    async fn test_create_issue() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "summary".to_string() => json!("This is the ticket summary"),
            "project_id".to_string() => json!("10000"),
            "issue_type".to_string() => json!("Bug"),
            "description".to_string() => json!("{\"content\": [{\"content\": [{\"text\": \"Order entry fails when selecting supplier.\", \"type\": \"text\"}], \"type\": \"paragraph\"}], \"type\": \"doc\", \"version\": 1}"),
            "assignee".to_string() => json!("712020:8f417ffa-dc11-42b9-8464-b9e8b7a31559"),
            "labels".to_string() => json!("label1, label2"),
            "priority".to_string() => json!("High"),
            "custom_fields".to_string() => json!("{\"customfield_10042\": \"this is my custom field\"}"),
            "components".to_string() => json!("[{\"name\": \"Component1\"}, {\"name\": \"Component2\"}]")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "CREATE_ISSUE",
                "credentials",
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_assign_issue() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "issue_id_or_key".to_string() => json!("ADM-123"),
            "account_id".to_string() => json!("712020:8f417ffa-dc11-42b9-8464-b9e8b7a31559")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "ASSIGN_ISSUE",
                "credentials",
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }
}
