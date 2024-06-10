use super::IntegrationExecutor;
use crate::workflow::{
    context::Context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_number_parameter, get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use tokio::time::{sleep, Duration};

const INTEGRATION: &str = "Opsgenie";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct OpsgenieCredential {
    api_key: String,
    instance: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OpsgenieExecutor;

impl IntegrationExecutor for OpsgenieExecutor {
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
        let credential = context
            .secrets_manager
            .fetch_secret::<OpsgenieCredential>(credential_name, &context.workflow_id)
            .await?;

        let base_api_url = if let Some(instance) = credential.instance.as_ref() {
            match instance.as_str() {
                "EU" | "eu" => "https://api.eu.opsgenie.com",
                _ => "https://api.opsgenie.com",
            }
        } else {
            "https://api.opsgenie.com"
        };

        match api {
            "CREATE_ALERT" => {
                create_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "DELETE_ALERT" => {
                delete_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "GET_ALERT" => {
                get_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "LIST_ALERTS" => {
                list_alerts(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "CLOSE_ALERT" => {
                close_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ACKNOWLEDGE_ALERT" => {
                acknowledge_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "UNACKNOWLEDGE_ALERT" => {
                unacknowledge_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "SNOOZE_ALERT" => {
                snooze_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ADD_NOTE_TO_ALERT" => {
                add_note_to_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ESCALATE_ALERT_TO_NEXT" => {
                escalate_alert_to_next(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ASSIGN_ALERT" => {
                assign_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ADD_TEAM_TO_ALERT" => {
                add_team_to_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ADD_RESPONDER_TO_ALERT" => {
                add_responder_to_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ADD_TAGS_TO_ALERT" => {
                add_tags_to_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "ADD_DETAILS_TO_ALERT" => {
                add_details_to_alert(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "UPDATE_ALERT_PRIORITY" => {
                update_alert_priority(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "LIST_ALERT_RECIPIENTS" => {
                list_alert_recipients(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            "UPDATE_ALERT_MESSAGE" => {
                update_alert_message(
                    client,
                    context,
                    base_api_url,
                    credential.api_key,
                    parameters,
                )
                .await
            }
            _ => return Err(anyhow!("API {api} not implemented for {INTEGRATION}.")),
        }
    }
}

const MAX_RETRIES: u32 = 20;

async fn wait_for_request(
    client: &dyn HttpClient,
    response: serde_json::Value,
    base_api_url: &str,
    api_key: &str,
    error_message: String,
) -> Result<serde_json::Value> {
    match response.get("result") {
        None => {
            return Err(anyhow!(
                "Failed to schedule operation via Opsgenie API. Received: {:?}",
                response
            ))
        }
        Some(result) => {
            if result.is_string() && result.as_str().unwrap() != "Request will be processed" {
                return Err(anyhow!(
                    "Failed to schedule operation via Opsgenie API. Received: {:?}",
                    response
                ));
            }
        }
    };

    let request_id = response
        .get("requestId")
        .expect("Missing request ID")
        .as_str()
        .expect("Request ID not a string");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    let request_status_api_url = format!("{base_api_url}/{request_id}");

    for retries in 0..MAX_RETRIES {
        let result = client
            .get(
                &request_status_api_url,
                headers.clone(),
                200,
                error_message.clone(),
            )
            .await;

        if result.is_ok() {
            return result;
        }

        // Exponential backoff with full jitter
        // https://aws.amazon.com/de/blogs/architecture/exponential-backoff-and-jitter/
        if retries + 1 < MAX_RETRIES {
            let base_timeout_ms = 5u64;
            let temp = base_timeout_ms * 2u64.pow(retries + 1);
            let sleep_time_ms = {
                let mut rng = rand::thread_rng();
                rng.gen_range(0..=temp)
            };

            tracing::info!("Opsgenie - Sleeping for {sleep_time_ms} ms before retrying to check the request status");
            sleep(Duration::from_millis(sleep_time_ms)).await;
        }
    }

    Err(anyhow!(error_message))
}

async fn post_and_wait_for_request(
    client: &dyn HttpClient,
    api_url: &str,
    result_status_base_api_url: &str,
    api_key: &str,
    body: serde_json::Value,
    error_message: String,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    // Schedule request
    let response = client
        .post(
            &api_url,
            headers.clone(),
            RequestBodyType::Json { body: json!(body) },
            202,
            error_message.clone(),
        )
        .await?;

    wait_for_request(
        client,
        response,
        result_status_base_api_url,
        api_key,
        error_message,
    )
    .await
}


async fn put_and_wait_for_request(
    client: &dyn HttpClient,
    api_url: &str,
    result_status_base_api_url: &str,
    api_key: &str,
    body: serde_json::Value,
    error_message: String,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    // Schedule request
    let response = client
        .put(
            &api_url,
            headers.clone(),
            RequestBodyType::Json { body: json!(body) },
            202,
            error_message.clone(),
        )
        .await?;

    wait_for_request(
        client,
        response,
        result_status_base_api_url,
        api_key,
        error_message,
    )
    .await
}

async fn delete_and_wait_for_request(
    client: &dyn HttpClient,
    api_url: &str,
    result_status_base_api_url: &str,
    api_key: &str,
    error_message: String,
) -> Result<serde_json::Value> {
    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    // Schedule request
    let response = client
        .delete(&api_url, headers.clone(), 202, error_message.clone())
        .await?;

    wait_for_request(
        client,
        response,
        result_status_base_api_url,
        api_key,
        error_message,
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#section-create-alert
async fn create_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let message = get_string_parameter(
        "MESSAGE",
        INTEGRATION,
        "CREATE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message is a required parameter");

    let mut body = hashmap! {
        "message".to_string() => json!(message)
    };

    for string_field_name in [
        "ALIAS",
        "DESCRIPTION",
        "ENTITY",
        "SOURCE",
        "PRIORITY",
        "USER",
        "NOTE",
    ] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "CREATE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    for json_object_name in ["DETAILS", "RESPONDERS", "VISIBLE_TO", "ACTIONS", "TAGS"] {
        if let Some(details) = get_string_parameter(
            json_object_name,
            INTEGRATION,
            "CREATE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !details.is_empty() {
                let details = serde_json::from_str::<serde_json::Value>(&details)?;
                body.insert(json_object_name.to_lowercase(), details);
            }
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts");

    post_and_wait_for_request(
        client,
        &api_url,
        &format!("{base_api_url}/v2/alerts/requests"),
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Create Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#delete-alert
async fn delete_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "DELETE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "DELETE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={identifier_type}"));
        }
    }

    if let Some(user) = get_string_parameter(
        "USER",
        INTEGRATION,
        "DELETE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !user.is_empty() {
            query_params.push(format!("user={user}"));
        }
    }

    if let Some(source) = get_string_parameter(
        "SOURCE",
        INTEGRATION,
        "DELETE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !source.is_empty() {
            query_params.push(format!("source={source}"));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}{query_string}");
    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    delete_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        format!("Failed to call {INTEGRATION} - Delete Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#get-alert
async fn get_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "GET_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_string = String::new();

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "GET_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_string = format!("?identifierType={identifier_type}");
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}{query_string}");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .get(
            &api_url,
            headers,
            200,
            format!("Failed to call {INTEGRATION} - Get Alert API"),
        )
        .await
}

// https://docs.opsgenie.com/docs/alert-api#list-alerts
async fn list_alerts(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = vec![];

    for (key, query_param_pattern) in [
        ("QUERY", "query={}"),
        ("SEARCH_IDENTIFIER", "searchIdentifier={}"),
        ("SEARCH_IDENTIFIER_TYPE", "searchIdentifierType={}"),
        ("SORT", "sort={}"),
        ("ORDER", "order={}"),
    ] {
        if let Some(value) = get_string_parameter(
            key,
            INTEGRATION,
            "LIST_ALERTS",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                query_params.push(query_param_pattern.replace("{}", &value));
            }
        }
    }

    if let Some(offset) = get_number_parameter(
        "OFFSET",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        query_params.push(format!("offset={offset}"));
    }

    let limit = match get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        Some(limit) => match limit.as_u64() {
            Some(limit) => Some(limit as usize),
            None => return Err(anyhow!("Error: Limit must be an unsigned integer")),
        },
        None => None,
    };

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts{}", query_string);

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    // Handle pagination
    let mut current_api_url = api_url.to_string();
    let mut alerts = Vec::new();
    loop {
        let result = client
            .get(
                &current_api_url,
                headers.clone(),
                200,
                format!("Failed to call {INTEGRATION} - List Alerts API"),
            )
            .await?;

        let data = result
            .get("data")
            .expect("must have data field")
            .as_array()
            .expect("must be an array")
            .to_vec();
        alerts.extend(data.into_iter());

        if limit.is_some() && alerts.len() >= limit.unwrap() {
            alerts.truncate(limit.unwrap());
            break;
        }

        match result.get("paging") {
            None => break,
            Some(paging) => match paging.get("next") {
                None => break,
                Some(next) => {
                    current_api_url = next.as_str().expect("must be a string").to_string()
                }
            },
        };
    }

    Ok(json!({
        "data": alerts
    }))
}

// https://docs.opsgenie.com/docs/alert-api#close-alert
async fn close_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "CLOSE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "CLOSE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/close{query_string}"
    );

    let mut body = HashMap::new();

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "CLOSE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), value);
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Close Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#acknowledge-alert
async fn acknowledge_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ACKNOWLEDGE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ACKNOWLEDGE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/acknowledge{query_string}",
    );

    let mut body = HashMap::new();

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "ACKNOWLEDGE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), value);
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Acknowledge Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#unacknowledge-alert
async fn unacknowledge_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "UNACKNOWLEDGE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "UNACKNOWLEDGE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/unacknowledge{query_string}",
    );

    let mut body = HashMap::new();

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "UNACKNOWLEDGE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), value);
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Unacknowledge Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#snooze-alert
async fn snooze_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "SNOOZE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "SNOOZE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/snooze{query_string}",
    );

    let end_time = get_string_parameter(
        "END_TIME",
        INTEGRATION,
        "SNOOZE_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("endTime is a required parameter");

    let mut body = hashmap! {
        "endTime".to_string() => end_time
    };

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "SNOOZE_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), value);
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Snooze Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#add-note-to-alert
async fn add_note_to_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ADD_NOTE_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ADD_NOTE_TO_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/notes{query_string}",
    );

    let note = get_string_parameter(
        "NOTE",
        INTEGRATION,
        "ADD_NOTE_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("note is a required parameter");

    let mut body = hashmap! {
        "note".to_string() => note
    };

    for field_name in ["USER", "SOURCE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "ADD_NOTE_TO_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), value);
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Add Note to Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#escalate-alert-to-next
async fn escalate_alert_to_next(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ESCALATE_ALERT_TO_NEXT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ESCALATE_ALERT_TO_NEXT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/escalate{query_string}",
    );

    let escalation_json = get_string_parameter("ESCALATION", INTEGRATION, "ESCALATE_ALERT_TO_NEXT", parameters, context, ParameterType::Required).await?.expect("required parameter");
    let escalation = serde_json::from_str::<serde_json::Value>(&escalation_json)?;

    let mut body = hashmap! {
        "escalation".to_string() => escalation
    };

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "ESCALATE_ALERT_TO_NEXT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if value.is_empty() {
                body.insert(field_name.to_lowercase(), json!(value));
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Escalate Alert to Next API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#assign-alert
async fn assign_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ASSIGN_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ASSIGN_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/assign{query_string}",
    );

    let owner_json = get_string_parameter("OWNER", INTEGRATION, "ASSIGN_ALERT", parameters, context, ParameterType::Required).await?.expect("required parameter");
    let owner = serde_json::from_str::<serde_json::Value>(&owner_json)?;

    let mut body = hashmap! {
        "owner".to_string() => owner
    };

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "ASSIGN_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), json!(value));
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Assign Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#add-team-to-alert
async fn add_team_to_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ADD_TEAM_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ADD_TEAM_TO_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={}", identifier_type));
        }
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!(
        "{base_api_url}/v2/alerts/{identifier}/teams{query_string}",
    );

    let team_json = get_string_parameter("TEAM", INTEGRATION, "ADD_TEAM_TO_ALERT", parameters, context, ParameterType::Required).await?.expect("required parameter");
    let team = serde_json::from_str::<serde_json::Value>(&team_json)?;

    let mut body = hashmap! {
        "team".to_string() => team
    };

    for field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            field_name,
            INTEGRATION,
            "ADD_TEAM_TO_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(field_name.to_lowercase(), json!(value));
            }
        }
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Add Team to Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#add-responder-to-alert
async fn add_responder_to_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = Vec::new();
    if let Some(value) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !value.is_empty() {
            query_params.push(format!("identifierType={value}"));
        }
    }

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier)
    };

    for string_field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "ADD_RESPONDER_TO_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(string_field_name.to_lowercase(), json!(value));
            }
        }
    }

    let responder_json = get_string_parameter(
        "RESPONDER",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("responder is a required parameter");
    let responder = serde_json::from_str::<serde_json::Value>(&responder_json)?;

    body.insert("responder".to_string(), responder);

    let mut api_url = format!("{base_api_url}/v2/alerts/{identifier}/responders");
    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Add Responder to Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api#add-tags-to-alert
async fn add_tags_to_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ADD_TAGS_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let tags_json = get_string_parameter(
        "TAGS",
        INTEGRATION,
        "ADD_TAGS_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("tags is a required parameter");
    let tags = serde_json::from_str::<Vec<String>>(&tags_json)?;

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "tags".to_string() => json!(tags)
    };

    for string_field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "ADD_TAGS_TO_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(string_field_name.to_lowercase(), json!(value));
            }
        }
    }

    let mut query_params = Vec::new();
    if let Some(value) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !value.is_empty() {
            query_params.push(format!("identifierType={value}"));
        }
    }

    let mut api_url = format!("{base_api_url}/v2/alerts/{identifier}/tags");
    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Add Tags to Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api-continued#add-details-custom-properties-to-alert
async fn add_details_to_alert(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "ADD_DETAILS_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let details_json = get_string_parameter(
        "DETAILS",
        INTEGRATION,
        "ADD_DETAILS_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("details is a required parameter");
    let details = serde_json::from_str::<serde_json::Value>(&details_json)?;

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "details".to_string() => details 
    };

    for string_field_name in ["USER", "SOURCE", "NOTE"] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "ADD_DETAILS_TO_ALERT",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            if !value.is_empty() {
                body.insert(string_field_name.to_lowercase(), json!(value));
            }
        }
    }

    let mut query_params = Vec::new();
    if let Some(value) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !value.is_empty() {
            query_params.push(format!("identifierType={value}"));
        }
    }

    let mut api_url = format!("{base_api_url}/v2/alerts/{identifier}/details");
    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Add Details to Alert API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api-continued#update-alert-priority
async fn update_alert_priority(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "UPDATE_ALERT_PRIORITY",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let priority = get_string_parameter(
        "PRIORITY",
        INTEGRATION,
        "UPDATE_ALERT_PRIORITY",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("priority is a required parameter");

    let body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "priority".to_string() => json!(priority)
    };

    let mut query_params = Vec::new();
    if let Some(value) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !value.is_empty() {
            query_params.push(format!("identifierType={value}"));
        }
    }

    let mut api_url = format!("{base_api_url}/v2/alerts/{identifier}/priority");
    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    post_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Update Alert Priority API"),
    )
    .await
}

// https://docs.opsgenie.com/docs/alert-api-continued#list-alert-recipients
async fn list_alert_recipients(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "LIST_ALERT_RECIPIENTS",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let mut query_params = Vec::new();
    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "LIST_ALERT_RECIPIENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={identifier_type}"));
        }
    }

    let mut api_url = format!("{base_api_url}/v2/alerts/{identifier}/recipients");
    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .get(
            &api_url,
            headers,
            200,
            format!("Failed to call {INTEGRATION} - List Alert Recipients API"),
        )
        .await
}

// https://docs.opsgenie.com/docs/alert-api-continued#update-alert-message
async fn update_alert_message(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let identifier = get_string_parameter(
        "IDENTIFIER",
        INTEGRATION,
        "UPDATE_ALERT_MESSAGE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("identifier is a required parameter");

    let message = get_string_parameter(
        "MESSAGE",
        INTEGRATION,
        "UPDATE_ALERT_MESSAGE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("message is a required parameter");

    let body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "message".to_string() => json!(message)
    };

    let mut query_params = Vec::new();
    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "LIST_ALERT_RECIPIENTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await?
    {
        if !identifier_type.is_empty() {
            query_params.push(format!("identifierType={identifier_type}"));
        }
    }

    let mut api_url = format!("{base_api_url}/v2/alerts/{identifier}/message");
    if !query_params.is_empty() {
        api_url = format!("{api_url}?{}", query_params.join("&"));
    }

    let result_status_base_api_url = format!("{base_api_url}/v2/alerts/requests");

    put_and_wait_for_request(
        client,
        &api_url,
        &result_status_base_api_url,
        &api_key,
        json!(body),
        format!("Failed to call {INTEGRATION} - Update Alert Message API"),
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::{Credential, Database};
    use async_trait::async_trait;
    use serde_json::json;
    use std::cell::RefCell;
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    struct MockHttpClientWithAsyncRequests {
        state: Mutex<RefCell<i32>>,
    }

    #[async_trait]
    impl HttpClient for MockHttpClientWithAsyncRequests {
        async fn post(
            &self,
            url: &str,
            _headers: HashMap<String, String>,
            _body: RequestBodyType,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({"result": "Request will be processed", "requestId": url}))
        }

        async fn put(
            &self,
            url: &str,
            _headers: HashMap<String, String>,
            _body: RequestBodyType,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({"result": "Request will be processed", "requestId": url}))
        }

        async fn delete(
            &self,
            url: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({"result": "Request will be processed", "requestId": url}))
        }

        async fn get(
            &self,
            url: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            let lockguard = self.state.lock().unwrap();
            let state = *lockguard.borrow();

            if state < 2 {
                lockguard.replace(state + 1);
                return Err(anyhow!("Response Status: 404. Error Response Message: {{ \"message\":\"Request not found. It might not be processed, yet.\",\"took\":0.003,\"requestId\":\"b8b1a9f5-bdc5-46bf-947d-b35cd40686fd\"}}"));
            }

            Ok(serde_json::json!({"url": url}))
        }
    }

    struct MockHttpClient;
    #[async_trait]
    impl HttpClient for MockHttpClient {
        async fn get(
            &self,
            url: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({"url": url}))
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
                secret: "{\"API_KEY\": \"some-api-key\", \"INSTANCE\": \"EU\"}".to_string(),
                credential_type: Some("OPSGENIE".to_string()),
            }))
        }
    }

    struct MockDbNonEu;
    #[async_trait]
    impl Database for MockDbNonEu {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential {
                secret: "{\"API_KEY\": \"some-api-key\"}".to_string(),
                credential_type: Some("OPSGENIE".to_string()),
            }))
        }
    }

    async fn setup(db: Arc<dyn Database>) -> (Arc<MockHttpClientWithAsyncRequests>, Context) {
        let client = Arc::new(MockHttpClientWithAsyncRequests::default());
        let context = Context::init(
            "ddd54f25-0537-4e40-ab96-c93beee543de".to_string(),
            None,
            db,
            client.clone(),
        )
        .await
        .unwrap();
        (client, context)
    }

    async fn setup_without_async_requests() -> (Arc<MockHttpClient>, Context) {
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
    async fn test_non_eu_credential() {
        let (client, context) = setup(Arc::new(MockDbNonEu)).await;
        let parameters = hashmap! {
            "MESSAGE".to_string() => json!("Test 123")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "CREATE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(value, json!({"url": "https://api.opsgenie.com/v2/alerts/requests/https://api.opsgenie.com/v2/alerts"}));
    }

    #[tokio::test]
    async fn test_create_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "MESSAGE".to_string() => json!("Test 123"),
            "ALIAS".to_string() => json!("abcdef"),
            "DESCRIPTION".to_string() => json!("some description"),
            "ENTITY".to_string() => json!("test"),
            "SOURCE".to_string() => json!("admyral"),
            "PRIORITY".to_string() => json!("P1"),
            "USER".to_string() => json!("admyral"),
            "NOTE".to_string() => json!("test description"),
            "DETAILS".to_string() => json!("{\"key\": \"value\"}"),
            "RESPONDERS".to_string() => json!("[{\"name\": \"secops\", \"type\": \"team\"}]"),
            "VISIBLE_TO".to_string() => json!("[{\"username\": \"admyral\", \"type\": \"user\"}]"),
            "ACTIONS".to_string() => json!("[\"abc\"]"),
            "TAGS".to_string() => json!("[\"tag1\", \"tag2\"]")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "CREATE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts"})
        );
    }

    #[tokio::test]
    async fn test_delete_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "DELETE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789?identifierType=id&user=Me&source=Admyral"})
        );
    }

    #[tokio::test]
    async fn test_get_alert() {
        let (client, context) = setup_without_async_requests().await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
        };
        let result = OpsgenieExecutor
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
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/123456789?identifierType=id"})
        );
    }

    #[derive(Default)]
    struct MockHttpClientWithPagination {
        state: Mutex<RefCell<i32>>,
    }

    #[async_trait]
    impl HttpClient for MockHttpClientWithPagination {
        async fn get(
            &self,
            url: &str,
            _headers: HashMap<String, String>,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            let lockguard = self.state.lock().unwrap();
            let state = *lockguard.borrow();

            if state == 0 {
                lockguard.replace(state + 1);
                return Ok(json!({
                    "data": [url],
                    "paging": {
                        "next": "some-next-url"
                    }
                }));
            }

            Ok(json!({"data": [url]}))
        }
    }

    async fn setup_with_pagination() -> (Arc<MockHttpClientWithPagination>, Context) {
        let client = Arc::new(MockHttpClientWithPagination::default());
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
        let (client, context) = setup_with_pagination().await;
        let parameters = hashmap! {
            "QUERY".to_string() => json!("status: open"),
            "OFFSET".to_string() => json!(2),
            "LIMIT".to_string() => json!(2),
            "SORT".to_string() => json!("tinyId"),
            "ORDER".to_string() => json!("desc"),
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "LIST_ALERTS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"data": [
                "https://api.eu.opsgenie.com/v2/alerts?query=status: open&sort=tinyId&order=desc&offset=2",
                "some-next-url"
            ]})
        );
    }

    #[tokio::test]
    async fn test_close_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "CLOSE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/close?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_acknowledge_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ACKNOWLEDGE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/acknowledge?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_unacknowledge_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "UNACKNOWLEDGE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/unacknowledge?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_snooze_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "END_TIME".to_string() => json!("2024-06-10T17:50:00Z"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "SNOOZE_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/snooze?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_add_note_to_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ADD_NOTE_TO_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/notes?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_escalate_alert_to_next() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "ESCALATION".to_string() => json!("{\"id\": \"some-id\"}"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ESCALATE_ALERT_TO_NEXT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/escalate?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_assign_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "OWNER".to_string() => json!("{\"id\": \"abcdefg\"}"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ASSIGN_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/assign?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_add_team_to_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "TEAM".to_string() => json!("{\"id\": \"abcdefg\"}"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ADD_TEAM_TO_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/teams?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_add_responder_to_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "RESPONDER".to_string() => json!("{\"type\": \"user\", \"username\": \"responder@admyral.dev\"}"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ADD_RESPONDER_TO_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/responders?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_add_tags_to_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "TAGS".to_string() => json!("[\"tag1\", \"tag2\"]"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ADD_TAGS_TO_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/tags?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_add_details_to_alert() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "DETAILS".to_string() => json!("{\"key\": \"value\"}"),
            "USER".to_string() => json!("Me"),
            "SOURCE".to_string() => json!("Admyral"),
            "NOTE".to_string() => json!("some note")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "ADD_DETAILS_TO_ALERT",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/details?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_update_alert_priority() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "PRIORITY".to_string() => json!("P3")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "UPDATE_ALERT_PRIORITY",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/priority?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_list_alert_recipients() {
        let (client, context) = setup_without_async_requests().await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "LIST_ALERT_RECIPIENTS",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/123456789/recipients?identifierType=id"})
        );
    }

    #[tokio::test]
    async fn test_update_alert_message() {
        let (client, context) = setup(Arc::new(MockDb)).await;
        let parameters = hashmap! {
            "IDENTIFIER".to_string() => json!("123456789"),
            "IDENTIFIER_TYPE".to_string() => json!("id"),
            "MESSAGE".to_string() => json!("new message")
        };
        let result = OpsgenieExecutor
            .execute(
                &*client,
                &context,
                "UPDATE_ALERT_MESSAGE",
                &Some("credentials".to_string()),
                &parameters,
            )
            .await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert_eq!(
            value,
            json!({"url": "https://api.eu.opsgenie.com/v2/alerts/requests/https://api.eu.opsgenie.com/v2/alerts/123456789/message?identifierType=id"})
        );
    }
}
