use super::ActionExecutor;
use super::{context::Context, reference_resolution::resolve_references};
use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use lazy_static::lazy_static;
use reqwest::header::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::json;

lazy_static! {
    static ref REQ_CLIENT: reqwest::Client = reqwest::Client::new();
    static ref OPENAI_API_KEY: AsyncOnce<String> = AsyncOnce::new(async {
        std::env::var("OPENAI_API_KEY").expect("Missing environment variable OPENAI_API_KEY")
    });
}

const OPENAI_CHAT_COMPLETION_API: &str = "https://api.openai.com/v1/chat/completions";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LLM {
    #[serde(rename = "gpt-4-turbo")]
    Gpt4Turbo,
    #[serde(rename = "gpt-3.5-turbo")]
    Gpt35Turbo,
}

impl LLM {
    async fn openai_chat_completion(&self, prompt: &str, max_tokens: usize) -> Result<String> {
        let client = REQ_CLIENT.clone();

        let mut headers = HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        let api_key = OPENAI_API_KEY.get().await;
        headers.insert(
            "Authorization",
            format!("Bearer {api_key}").parse().unwrap(),
        );

        let body = json!({
            "model": self.to_string(),
            "messages": vec![json!({
                "role": "user",
                "content": prompt
            })],
            "max_tokens": max_tokens,
        });

        let response = client
            .post(OPENAI_CHAT_COMPLETION_API)
            .headers(headers)
            .json(&body)
            .send()
            .await?;

        let http_status = response.status().as_u16();
        if http_status != 200 {
            tracing::error!("Failed to call OpenAI API. Response: {:?}", response);
            return Err(anyhow!("Failed to call OpenAI API!"));
        }

        let response = response.json::<serde_json::Value>().await?;
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
}

impl std::fmt::Display for LLM {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Self::Gpt4Turbo => write!(f, "gpt-4-turbo"),
            Self::Gpt35Turbo => write!(f, "gpt-3.5-turbo"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAction {
    model: LLM,
    prompt: String,
}

impl ActionExecutor for AiAction {
    /// Outputs: {"output": "<llm-response>"}
    async fn execute(&self, context: &Context) -> Result<serde_json::Value> {
        let prompt = resolve_references(&self.prompt, context).await?.value;
        let prompt = prompt.as_str().unwrap().to_string();

        let max_tokens = 500;
        let response = self
            .model
            .openai_chat_completion(&prompt, max_tokens)
            .await?;

        Ok(json!({
            "output": response
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serde_value() {
        let s = "\"gpt-4-turbo\"";
        let llm = serde_json::from_str::<LLM>(s).unwrap();
        assert_eq!(LLM::Gpt4Turbo, llm);

        let out = llm.to_string();
        assert_eq!("gpt-4-turbo", &out);
    }
}
