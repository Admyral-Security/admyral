use crate::workflow::context::Context;
use crate::workflow::http_client::{HttpClient, RequestBodyType};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;

const ANTHROPIC_MESSAGES_API: &str = "https://api.anthropic.com/v1/messages";

const ANTHROPIC_MAX_TOKENS: u64 = 4096;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct AnthropicCredential {
    api_key: String,
}

async fn anthropic_messages(
    client: &dyn HttpClient,
    api_key: &str,
    model: &str,
    prompt: &str,
    temperature_opt: Option<f64>,
    top_p_opt: Option<f64>,
    max_tokens_opt: Option<u64>,
) -> Result<String> {
    let mut body = hashmap! {
        "model".to_string() => json!(model),
        "messages".to_string() => json!([
            {
                "role": "user",
                "content": prompt
            }
        ])
    };

    if let Some(temperature) = temperature_opt {
        body.insert("temperature".to_string(), json!(temperature));
    }

    if let Some(top_p) = top_p_opt {
        body.insert("top_p".to_string(), json!(top_p));
    }

    let max_tokens = match max_tokens_opt {
        Some(max_tokens) => max_tokens,
        None => ANTHROPIC_MAX_TOKENS,
    };
    body.insert("max_tokens".to_string(), json!(max_tokens));

    let response = client
        .post(
            ANTHROPIC_MESSAGES_API,
            hashmap! {
                "content-type".to_string() => "application/json".to_string(),
                "x-api-key".to_string() => api_key.to_string(),
                "anthropic-version".to_string() => "2023-06-01".to_string(),
            },
            RequestBodyType::Json { body: json!(body) },
            200,
            format!("Failed to call Anthropic API"),
        )
        .await?;

    let message = &response.get("content").unwrap().as_array().unwrap()[0];
    let message_type = message.get("type").unwrap().as_str().unwrap();
    if message_type != "text" {
        let error = format!("Unsupported message type returned: {message_type}");
        tracing::error!(error);
        return Err(anyhow!(error));
    }

    let message_text = message.get("text").unwrap().as_str().unwrap().to_string();

    Ok(message_text)
}

pub async fn anthropic_inference(
    context: &Context,
    client: &dyn HttpClient,
    credential_name: &String,
    model: &str,
    prompt: &str,
    temperature: Option<f64>,
    top_p: Option<f64>,
    max_tokens: Option<u64>,
) -> Result<String> {
    let api_key = context
        .secrets_manager
        .fetch_secret::<AnthropicCredential>(credential_name, &context.workflow_id)
        .await?
        .api_key;
    anthropic_messages(
        client,
        &api_key,
        model,
        prompt,
        temperature,
        top_p,
        max_tokens,
    )
    .await
}
