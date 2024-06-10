use crate::workflow::context::Context;
use crate::workflow::http_client::{HttpClient, RequestBodyType};
use anyhow::Result;
use async_once::AsyncOnce;
use lazy_static::lazy_static;
use maplit::hashmap;
use serde::{Deserialize, Serialize};
use serde_json::json;

lazy_static! {
    static ref OPENAI_API_KEY: AsyncOnce<String> = AsyncOnce::new(async {
        std::env::var("OPENAI_API_KEY").expect("Missing environment variable OPENAI_API_KEY")
    });
}

const OPENAI_CHAT_COMPLETION_API: &str = "https://api.openai.com/v1/chat/completions";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct Credential {
    api_key: String,
}

async fn openai_chat_completion(
    endpoint: &str,
    client: &dyn HttpClient,
    api_key: &str,
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

    let response = client
        .post(
            endpoint,
            hashmap! {
                "Content-Type".to_string() => "application/json".to_string(),
                "Authorization".to_string() => format!("Bearer {api_key}")
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

pub async fn openai_inference(
    endpoint: &str,
    context: &Context,
    client: &dyn HttpClient,
    credential_name: &Option<String>,
    model: &str,
    prompt: &str,
    temperature: Option<f64>,
    top_p: Option<f64>,
    max_tokens: Option<u64>,
) -> Result<String> {
    let api_key = match credential_name {
        Some(credential_name) => {
            context
                .secrets_manager
                .fetch_secret::<Credential>(credential_name, &context.workflow_id)
                .await?
                .api_key
        }
        None => OPENAI_API_KEY.get().await.to_string(),
    };
    openai_chat_completion(
        endpoint,
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
