use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_bool_parameter, get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const INTEGRATION: &str = "Jira";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct JiraCredential {
    domain: String,
    email: String,
    api_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JiraExecutor;

impl IntegrationExecutor for JiraExecutor {
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
            .fetch_secret::<JiraCredential>(credential_name, &context.workflow_id)
            .await?;
        match api {
            "CREATE_ISSUE" => create_issue(client, context, &credential, parameters).await,
            "ASSIGN_ISSUE" => assign_issue(client, context, &credential, parameters).await,
            "EDIT_ISSUE" => edit_issue(client, context, &credential, parameters).await,
            "GET_ISSUE" => get_issue(client, context, &credential, parameters).await,
            "FIND_USERS" => find_users(client, context, &credential, parameters).await,
            "GET_ISSUE_COMMENTS" => {
                get_issue_comments(client, context, &credential, parameters).await
            }
            "ADD_COMMENT" => add_comment(client, context, &credential, parameters).await,
            "GET_FIELDS" => get_fields(client, context, &credential).await,
            "UPDATE_CUSTOM_FIELD" => {
                update_custom_field(client, context, &credential, parameters).await
            }
            "GET_ISSUE_TRANSITIONS" => {
                get_issue_transitions(client, context, &credential, parameters).await
            }
            "TRANSITION_ISSUE" => transition_issue(client, context, &credential, parameters).await,
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

async fn jira_get_request(
    client: &dyn HttpClient,
    api_url: &str,
    credential: &JiraCredential,
) -> Result<serde_json::Value> {
    // API Key Construction: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
    let api_key = format!("{}:{}", credential.email, credential.api_token);
    let api_key_base64 = STANDARD.encode(api_key);

    let headers = hashmap! {
        "Authorization".to_string() => format!("Basic {api_key_base64}"),
        "Accept".to_string() => "application/json".to_string(),
    };

    client
        .get(
            api_url,
            headers,
            200,
            format!("Error: Failed to call {INTEGRATION} API"),
        )
        .await
}

async fn jira_post_request(
    client: &dyn HttpClient,
    api_url: &str,
    credential: &JiraCredential,
    body: serde_json::Value,
    expected_response_status: u16,
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
            expected_response_status,
            format!("Error: Failed to call {INTEGRATION} API"),
        )
        .await
}

async fn jira_put_request(
    client: &dyn HttpClient,
    api_url: &str,
    credential: &JiraCredential,
    body: serde_json::Value,
    expected_http_status: u16,
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
            expected_http_status,
            format!("Error: Failed to call {INTEGRATION} API"),
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
        "SUMMARY",
        INTEGRATION,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("summary is a required parameter");

    let project_id = get_string_parameter(
        "PROJECT_ID",
        INTEGRATION,
        "CREATE_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("project_id is a required parameter");

    let issue_type = get_string_parameter(
        "ISSUE_TYPE",
        INTEGRATION,
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
        "DESCRIPTION",
        INTEGRATION,
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
        "ASSIGNEE",
        INTEGRATION,
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
        "LABELS",
        INTEGRATION,
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
        "PRIORITY",
        INTEGRATION,
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
        "CUSTOM_FIELDS",
        INTEGRATION,
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
        "COMPONENTS",
        INTEGRATION,
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

    jira_post_request(client, &api_url, credential, json!({"fields": fields}), 201).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-assignee-put
async fn assign_issue(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "ASSIGN_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");

    let account_id = get_string_parameter(
        "ACCOUNT_ID",
        INTEGRATION,
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
        204,
    )
    .await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
async fn edit_issue(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut body = HashMap::new();

    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "EDIT_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");

    if let Some(fields) = get_string_parameter(
        "FIELDS",
        INTEGRATION,
        "EDIT_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !fields.is_empty() {
            match serde_json::from_str::<serde_json::Value>(&fields) {
                Ok(fields) => body.insert("fields", fields),
                Err(e) => {
                    return Err(anyhow!(
                        "Invalid input for \"Fields\". Expected a JSON object."
                    ))
                }
            };
        }
    }

    if let Some(update) = get_string_parameter(
        "UPDATE",
        INTEGRATION,
        "EDIT_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !update.is_empty() {
            match serde_json::from_str::<serde_json::Value>(&update) {
                Ok(update) => body.insert("update", update),
                Err(e) => {
                    return Err(anyhow!(
                        "Invalid input for \"Update\". Expected a JSON object."
                    ))
                }
            };
        }
    }

    let notify_users_opt = get_bool_parameter(
        "NOTIFY_USERS",
        INTEGRATION,
        "EDIT_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?;

    let api_url = match notify_users_opt {
        Some(notify_users) => format!("https://{}.atlassian.net/rest/api/3/issue/{issue_id_or_key}?returnIssue=true&notifyUsers={notify_users}", credential.domain),
        None => format!("https://{}.atlassian.net/rest/api/3/issue/{issue_id_or_key}?returnIssue=true", credential.domain)
    };

    jira_put_request(client, &api_url, credential, json!(body), 200).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
async fn get_issue(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "GET_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter");

    if let Some(fields) = get_string_parameter(
        "FIELDS",
        INTEGRATION,
        "GET_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !fields.is_empty() {
            query_params.push(format!("fields={fields}"));
        }
    }

    if let Some(fields_by_keys) = get_bool_parameter(
        "FIELDS_BY_KEYS",
        INTEGRATION,
        "GET_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        query_params.push(format!("fieldsByKeys={fields_by_keys}"));
    }

    if let Some(expand) = get_string_parameter(
        "EXPAND",
        INTEGRATION,
        "GET_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !expand.is_empty() {
            query_params.push(format!("expand={expand}"));
        }
    }

    if let Some(properties) = get_string_parameter(
        "PROPERTIES",
        INTEGRATION,
        "GET_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !properties.is_empty() {
            query_params.push(format!("properties={properties}"));
        }
    }

    let query_param_str = if query_params.is_empty() {
        "".to_string()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue/{issue_id_or_key}{query_param_str}",
        credential.domain
    );

    jira_get_request(client, &api_url, credential).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-user-search/#api-rest-api-3-user-search-get
async fn find_users(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    for (param_id, value_name) in [
        ("QUERY", "query"),
        ("ACCOUNT_ID", "accountId"),
        ("PROPERTY", "property"),
        ("USERNAME", "username"),
    ] {
        if let Some(param) = get_string_parameter(
            param_id,
            INTEGRATION,
            "FIND_USERS",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !param.is_empty() {
                query_params.push(format!("{value_name}={param}"));
            }
        }
    }

    for (param_id, value_name) in [("START_AT", "startAt"), ("MAX_RESULTS", "maxResults")] {
        if let Some(param) = get_number_parameter(
            param_id,
            INTEGRATION,
            "FIND_USERS",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            query_params.push(format!("{value_name}={param}"));
        }
    }

    let query_param_string = query_params.join("&");
    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/user/search?{query_param_string}",
        credential.domain
    );

    jira_get_request(client, &api_url, credential).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get
async fn get_issue_comments(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "GET_ISSUE_COMMENTS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");

    if let Some(start_at) = get_number_parameter(
        "START_AT",
        INTEGRATION,
        "GET_ISSUE_COMMENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        query_params.push(format!("startAt={start_at}"));
    }

    if let Some(max_results) = get_number_parameter(
        "MAX_RESULTS",
        INTEGRATION,
        "GET_ISSUE_COMMENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        query_params.push(format!("maxResults={max_results}"));
    }

    if let Some(order_by) = get_string_parameter(
        "ORDER_BY",
        INTEGRATION,
        "GET_ISSUE_COMMENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !order_by.is_empty() {
            query_params.push(format!("orderBy={order_by}"));
        }
    }

    if let Some(expand) = get_string_parameter(
        "EXPAND",
        INTEGRATION,
        "GET_ISSUE_COMMENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !expand.is_empty() {
            query_params.push(format!("expand={expand}"));
        }
    }

    let query_param_str = if query_params.is_empty() {
        "".to_string()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue/{issue_id_or_key}/comment{query_param_str}",
        credential.domain
    );

    jira_get_request(client, &api_url, credential).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post
async fn add_comment(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "ADD_COMMENT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");

    let body = get_string_parameter(
        "BODY",
        INTEGRATION,
        "ADD_COMMENT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("body is a required parameter!");

    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue/{}/comment",
        credential.domain, issue_id_or_key
    );

    jira_post_request(
        client,
        &api_url,
        credential,
        json!({ "body": serde_json::from_str::<serde_json::Value>(&body)? }),
        201,
    )
    .await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get
async fn get_fields(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
) -> Result<serde_json::Value> {
    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/field",
        credential.domain
    );

    jira_get_request(client, &api_url, credential).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-fieldid-put
async fn update_custom_field(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let field_id = get_string_parameter(
        "FIELD_ID",
        INTEGRATION,
        "UPDATE_CUSTOM_FIELD",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("field_id is a required parameter!");

    let name = get_string_parameter(
        "NAME",
        INTEGRATION,
        "UPDATE_CUSTOM_FIELD",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("name is a required parameter!");

    let mut body = hashmap! {
        "name".to_string() => json!(name)
    };

    if let Some(description) = get_string_parameter(
        "DESCRIPTION",
        INTEGRATION,
        "UPDATE_CUSTOM_FIELD",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        body.insert("description".to_string(), json!(description));
    }

    if let Some(searcher_key) = get_string_parameter(
        "SEARCHER_KEY",
        INTEGRATION,
        "UPDATE_CUSTOM_FIELD",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        body.insert("searcherKey".to_string(), json!(searcher_key));
    }

    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/field/{}",
        credential.domain, field_id
    );

    jira_put_request(client, &api_url, credential, json!(body), 204).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
async fn get_issue_transitions(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = Vec::new();

    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "GET_ISSUE_TRANSITIONS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");

    if let Some(expand) = get_string_parameter(
        "EXPAND",
        INTEGRATION,
        "GET_ISSUE_TRANSITIONS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !expand.is_empty() {
            query_params.push(format!("expand={expand}"));
        }
    }

    if let Some(transition_id) = get_string_parameter(
        "TRANSITION_ID",
        INTEGRATION,
        "GET_ISSUE_TRANSITIONS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !transition_id.is_empty() {
            query_params.push(format!("transitionId={transition_id}"));
        }
    }

    let query_param_str = if query_params.is_empty() {
        "".to_string()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue/{issue_id_or_key}/transitions{query_param_str}",
        credential.domain
    );

    jira_get_request(client, &api_url, credential).await
}

// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
async fn transition_issue(
    client: &dyn HttpClient,
    context: &context::Context,
    credential: &JiraCredential,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let issue_id_or_key = get_string_parameter(
        "ISSUE_ID_OR_KEY",
        INTEGRATION,
        "TRANSITION_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("issue_id_or_key is a required parameter!");

    let transition = get_string_parameter(
        "TRANSITION",
        INTEGRATION,
        "TRANSITION_ISSUE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("transition is a required parameter!");

    let mut body = hashmap! {
        "transition".to_string() => json!({"id": transition}),
    };

    if let Some(fields) = get_string_parameter(
        "FIELDS",
        INTEGRATION,
        "TRANSITION_ISSUE",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !fields.is_empty() {
            body.insert("fields".to_string(), serde_json::from_str(&fields)?);
        }
    }

    let api_url = format!(
        "https://{}.atlassian.net/rest/api/3/issue/{}/transitions",
        credential.domain, issue_id_or_key
    );

    jira_post_request(client, &api_url, credential, json!(body), 204).await
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
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential { secret: "{\"API_TOKEN\": \"some-api-key\", \"DOMAIN\": \"test\", \"EMAIL\": \"chris@admyral.dev\"}".to_string(), credential_type: Some("JIRA".to_string()) }))
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

    struct MockDbMalformedSecret;
    #[async_trait]
    impl Database for MockDbMalformedSecret {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential {
                secret: "{\"API_TOKEN\": \"some-api-key\"}".to_string(),
                credential_type: Some("JIRA".to_string()),
            }))
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
        {
            let (client, context) = setup(Arc::new(MockDbUnknownSecret)).await;
            let result = JiraExecutor
                .execute(
                    &*client,
                    &context,
                    "CREATE_ISSUE",
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

        {
            let (client, context) = setup(Arc::new(MockDbMalformedSecret)).await;
            let result = JiraExecutor
                .execute(
                    &*client,
                    &context,
                    "CREATE_ISSUE",
                    &Some("credentials".to_string()),
                    &HashMap::new(),
                )
                .await;
            assert!(result.is_err());
            assert_eq!(
                result.err().unwrap().to_string(),
                "Received malformed credential."
            );
        }
    }

    #[tokio::test]
    async fn test_create_issue() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "SUMMARY".to_string() => json!("This is the ticket summary"),
            "PROJECT_ID".to_string() => json!("10000"),
            "ISSUE_TYPE".to_string() => json!("Bug"),
            "DESCRIPTION".to_string() => json!("{\"content\": [{\"content\": [{\"text\": \"Order entry fails when selecting supplier.\", \"type\": \"text\"}], \"type\": \"paragraph\"}], \"type\": \"doc\", \"version\": 1}"),
            "ASSIGNEE".to_string() => json!("712020:8f417ffa-dc11-42b9-8464-b9e8b7a31559"),
            "LABELS".to_string() => json!("label1, label2"),
            "PRIORITY".to_string() => json!("High"),
            "CUSTOM_FIELDS".to_string() => json!("{\"customfield_10042\": \"this is my custom field\"}"),
            "COMPONENTS".to_string() => json!("[{\"name\": \"Component1\"}, {\"name\": \"Component2\"}]")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "CREATE_ISSUE",
                &Some("credentials".to_string()),
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
            "ISSUE_ID_OR_KEY".to_string() => json!("ADM-123"),
            "ACCOUNT_ID".to_string() => json!("712020:8f417ffa-dc11-42b9-8464-b9e8b7a31559")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "ASSIGN_ISSUE",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_edit_issue() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "ISSUE_ID_OR_KEY".to_string() => json!("ADM-123"),
            "FIELDS".to_string() => json!("{\"summary\": \"new summary\"}"),
            "UPDATE".to_string() => json!("{\"labels\": [{\"add\": \"triaged\"}]}"),
            "NOTIFY_USERS".to_string() => json!(true)
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "EDIT_ISSUE",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_get_issue() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "ISSUE_ID_OR_KEY".to_string() => json!("ADM-123"),
            "FIELDS".to_string() => json!("*all"),
            "FIELDS_BY_KEYS".to_string() => json!(false),
            "EXPAND".to_string() => json!("renderedFields,names,schema"),
            "PROPERTIES".to_string() => json!("*all,-prop1")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "GET_ISSUE",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_find_users() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "QUERY".to_string() => json!("john"),
            "ACCOUNT_ID".to_string() => json!("712020:8f417ffa-dc11-42b9-8464-b9e8b7a31559"),
            "PROPERTY".to_string() => json!("thepropertykey.something.nested=1"),
            "USERNAME".to_string() => json!("myusername"),
            "START_AT".to_string() => json!(0),
            "MAX_RESULTS".to_string() => json!(50)
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "FIND_USERS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_get_issue_comments() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "ISSUE_ID_OR_KEY".to_string() => json!("ADM-123"),
            "START_AT".to_string() => json!(0),
            "MAX_RESULTS".to_string() => json!(10),
            "ORDER_BY".to_string() => json!("created")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "GET_ISSUE_COMMENTS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_get_fields() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {}; // No parameters needed for this API
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "GET_FIELDS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_update_custom_field() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "FIELD_ID".to_string() => json!("customfield_10042"),
            "NAME".to_string() => json!("New Custom Field Name"),
            "DESCRIPTION".to_string() => json!("Updated description"),
            "SEARCHER_KEY".to_string() => json!("com.atlassian.jira.plugin.system.customfieldtypes:textsearcher")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "UPDATE_CUSTOM_FIELD",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_get_issue_transitions() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "ISSUE_ID_OR_KEY".to_string() => json!("ADM-123"),
            "EXPAND".to_string() => json!("transitions.fields"),
            "TRANSITION_ID".to_string() => json!("5")
        };
        let result = JiraExecutor
            .execute(
                &*client,
                &context,
                "GET_ISSUE_TRANSITIONS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"ok": true}));
    }
}
