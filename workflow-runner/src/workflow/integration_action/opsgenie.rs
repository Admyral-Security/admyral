use super::IntegrationExecutor;
use crate::workflow::{
    context::Context,
    http_client::{HttpClient, RequestBodyType},
    utils::{get_string_parameter, get_number_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

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
            let details = serde_json::from_str::<serde_json::Value>(&details)?;
            body.insert(json_object_name.to_lowercase(), details);
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Create Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    if let Some(user) = get_string_parameter(
        "USER",
        INTEGRATION,
        "DELETE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("user={}", user));
    }

    if let Some(source) = get_string_parameter(
        "SOURCE",
        INTEGRATION,
        "DELETE_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("source={}", source));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}{}", identifier, query_string);

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .delete(
            &api_url,
            headers,
            202,
            format!("Failed to call {INTEGRATION} - Delete Alert API"),
        )
        .await
}

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

    let mut query_params = vec![];

    if let Some(identifier_type) = get_string_parameter(
        "IDENTIFIER_TYPE",
        INTEGRATION,
        "GET_ALERT",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}{}", identifier, query_string);

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

async fn list_alerts(
    client: &dyn HttpClient,
    context: &Context,
    base_api_url: &str,
    api_key: String,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let mut query_params = vec![];

    if let Some(query) = get_string_parameter(
        "QUERY",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("query={}", query));
    }

    if let Some(search_identifier) = get_string_parameter(
        "SEARCH_IDENTIFIER",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("searchIdentifier={}", search_identifier));
    }

    if let Some(search_identifier_type) = get_string_parameter(
        "SEARCH_IDENTIFIER_TYPE",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("searchIdentifierType={}", search_identifier_type));
    }

    if let Some(offset) = get_number_parameter(
        "OFFSET",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("offset={}", offset));
    }

    if let Some(limit) = get_number_parameter(
        "LIMIT",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("limit={}", limit));
    }

    if let Some(sort) = get_string_parameter(
        "SORT",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("sort={}", sort));
    }

    if let Some(order) = get_string_parameter(
        "ORDER",
        INTEGRATION,
        "LIST_ALERTS",
        parameters,
        context,
        ParameterType::Optional,
    )
    .await? {
        query_params.push(format!("order={}", order));
    }

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

    client
        .get(
            &api_url,
            headers,
            200,
            format!("Failed to call {INTEGRATION} - List Alerts API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/close{}", identifier, query_string);

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
        .await? {
            body.insert(field_name.to_lowercase(), value);
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Close Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/acknowledge{}", identifier, query_string);

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
        .await? {
            body.insert(field_name.to_lowercase(), value);
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Acknowledge Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/unacknowledge{}", identifier, query_string);

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
        .await? {
            body.insert(field_name.to_lowercase(), value);
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Unacknowledge Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/snooze{}", identifier, query_string);

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
        .await? {
            body.insert(field_name.to_lowercase(), value);
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Snooze Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/notes{}", identifier, query_string);

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
        .await? {
            body.insert(field_name.to_lowercase(), value);
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Add Note to Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/escalate{}", identifier, query_string);

    let escalation = parameters.get("ESCALATION").ok_or_else(|| anyhow!("Missing required parameter: ESCALATION"))?;
    let escalation = escalation.to_string();

    let mut body = hashmap! {
        "escalation".to_string() => json!(escalation)
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
        .await? {
            body.insert(field_name.to_lowercase(), json!(value));
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Escalate Alert to Next API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/assign{}", identifier, query_string);

    let owner = parameters.get("OWNER").ok_or_else(|| anyhow!("Missing required parameter: OWNER"))?;
    let owner = owner.to_string();

    let mut body = hashmap! {
        "owner".to_string() => json!(owner)
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
        .await? {
            body.insert(field_name.to_lowercase(), json!(value));
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Assign Alert API"),
        )
        .await
}

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
    .await? {
        query_params.push(format!("identifierType={}", identifier_type));
    }

    let query_string = if query_params.is_empty() {
        String::new()
    } else {
        format!("?{}", query_params.join("&"))
    };

    let api_url = format!("{base_api_url}/v2/alerts/{}/teams{}", identifier, query_string);

    let team = parameters.get("TEAM").ok_or_else(|| anyhow!("Missing required parameter: TEAM"))?;
    let team = team.to_string();

    let mut body = hashmap! {
        "team".to_string() => json!(team)
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
        .await? {
            body.insert(field_name.to_lowercase(), json!(value));
        }
    }

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Add Team to Alert API"),
        )
        .await
}

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

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier)
    };

    for string_field_name in ["IDENTIFIER_TYPE", "USER", "SOURCE", "NOTE"] {
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
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    let responder = get_string_parameter(
        "RESPONDER",
        INTEGRATION,
        "ADD_RESPONDER_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("responder is a required parameter");

    body.insert("responder".to_string(), json!(responder));

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}/responders");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Add Responder to Alert API"),
        )
        .await
}

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

    let tags = get_string_parameter(
        "TAGS",
        INTEGRATION,
        "ADD_TAGS_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("tags is a required parameter");

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "tags".to_string() => json!(tags)
    };

    for string_field_name in ["IDENTIFIER_TYPE", "USER", "SOURCE", "NOTE"] {
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
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}/tags");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Add Tags to Alert API"),
        )
        .await
}

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

    let details = get_string_parameter(
        "DETAILS",
        INTEGRATION,
        "ADD_DETAILS_TO_ALERT",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("details is a required parameter");

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "details".to_string() => json!(details)
    };

    for string_field_name in ["IDENTIFIER_TYPE", "USER", "SOURCE", "NOTE"] {
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
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}/details");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .post(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Add Details to Alert API"),
        )
        .await
}

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

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "priority".to_string() => json!(priority)
    };

    for string_field_name in ["IDENTIFIER_TYPE"] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "UPDATE_ALERT_PRIORITY",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}/priority");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .put(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
            format!("Failed to call {INTEGRATION} - Update Alert Priority API"),
        )
        .await
}

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

    let mut query_params = hashmap! {
        "identifier".to_string() => identifier.clone(),
    };

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
        query_params.insert("identifierType".to_string(), identifier_type);
    }

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}/recipients");

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

    let mut body = hashmap! {
        "identifier".to_string() => json!(identifier),
        "message".to_string() => json!(message)
    };

    for string_field_name in ["IDENTIFIER_TYPE"] {
        if let Some(value) = get_string_parameter(
            string_field_name,
            INTEGRATION,
            "UPDATE_ALERT_MESSAGE",
            parameters,
            context,
            ParameterType::Optional,
        )
        .await?
        {
            body.insert(string_field_name.to_lowercase(), json!(value));
        }
    }

    let api_url = format!("{base_api_url}/v2/alerts/{identifier}/message");

    let headers = hashmap! {
        "Content-Type".to_string() => "application/json".to_string(),
        "Authorization".to_string() => format!("GenieKey {api_key}")
    };

    client
        .put(
            &api_url,
            headers,
            RequestBodyType::Json { body: json!(body) },
            202,
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
    use std::sync::Arc;

    struct MockHttpClient;

    #[async_trait]
    impl HttpClient for MockHttpClient {
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

    async fn setup(db: Arc<dyn Database>) -> (Arc<MockHttpClient>, Context) {
        let client = Arc::new(MockHttpClient);
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
        assert_eq!(value, json!({"ok": true}));
    }

    #[tokio::test]
    async fn test_create_alert() {
        let (client, context) = setup(Arc::new(MockDbNonEu)).await;
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
        assert_eq!(value, json!({"ok": true}));
    }
}
