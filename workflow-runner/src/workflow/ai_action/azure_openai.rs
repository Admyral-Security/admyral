use crate::workflow::context::Context;
use crate::workflow::http_client::{HttpClient, RequestBodyType};
use anyhow::Result;
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct AzureOpenAICredential {
    api_key: String,
    endpoint: String,
}

// https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#chat-completions
async fn azure_openai_chat_completion(
    client: &dyn HttpClient,
    api_key: &str,
    endpoint: &str,
    model: &str,
    prompt: &str,
    temperature: Option<f64>,
    top_p: Option<f64>,
    max_tokens: Option<u64>,
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

    if let Some(temperature) = temperature {
        body.insert("temperature".to_string(), json!(temperature));
    }

    if let Some(top_p) = top_p {
        body.insert("top_p".to_string(), json!(top_p));
    }

    if let Some(max_tokens) = max_tokens {
        body.insert("max_tokens".to_string(), json!(max_tokens));
    }

    let api_version = "2024-02-01";
    let suffix = format!("openai/deployments/{model}/chat/completions?api-version={api_version}");
    let api_url = if endpoint.ends_with("/") {
        format!("{endpoint}{suffix}")
    } else {
        format!("{endpoint}/{suffix}")
    };

    let response = client
        .post(
            &api_url,
            hashmap! {
                "Content-Type".to_string() => "application/json".to_string(),
                "api-key".to_string() => api_key.to_string(),
            },
            RequestBodyType::Json { body: json!(body) },
            200,
            format!("Failed to call OpenAI API"),
        )
        .await?;

    let assistant_message = response.get("choices").unwrap().as_array().unwrap()[0]
        .get("message")
        .unwrap();
    let message = assistant_message
        .get("content")
        .unwrap()
        .as_str()
        .unwrap()
        .to_string();

    Ok(message)
}

pub async fn azure_openai_inference(
    context: &Context,
    client: &dyn HttpClient,
    credential_name: &str,
    deployment_name: &str,
    prompt: &str,
    temperature: Option<f64>,
    top_p: Option<f64>,
    max_tokens: Option<u64>,
) -> Result<String> {
    let credential = context
        .secrets_manager
        .fetch_secret::<AzureOpenAICredential>(credential_name, &context.workflow_id)
        .await?;
    azure_openai_chat_completion(
        client,
        &credential.api_key,
        &credential.endpoint,
        deployment_name,
        prompt,
        temperature,
        top_p,
        max_tokens,
    )
    .await
}
