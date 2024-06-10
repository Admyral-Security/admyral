use super::http_client::ReqwestClient;
use super::ActionExecutor;
use super::{context::Context, reference_resolution::resolve_references};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;

mod anthropic;
mod azure_openai;
mod openai;

const OPENAI_CHAT_COMPLETION_API: &str = "https://api.openai.com/v1/chat/completions";
const MISTRAL_CHAT_COMPLETION_API: &str = "https://api.mistral.ai/v1/chat/completions";

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
enum LLMProvider {
    #[serde(rename = "ADMYRAL")]
    Admyral,
    #[serde(rename = "OPENAI")]
    OpenAI,
    #[serde(rename = "AZURE_OPENAI")]
    AzureOpenAI,
    #[serde(rename = "MISTRAL")]
    Mistral,
    #[serde(rename = "ANTHROPIC")]
    Anthropic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAction {
    provider: LLMProvider,
    model: String,
    credential: Option<String>,
    prompt: String,
    temperature: Option<f64>,
    top_p: Option<f64>,
    max_tokens: Option<u64>,
}

impl AiAction {
    fn from_json_impl(definition: serde_json::Value) -> Result<Self> {
        // Manual parsing to provide the user with better error messages

        let provider = serde_json::from_value::<LLMProvider>(json!(definition
            .get("provider")
            .ok_or(anyhow!("Unknown LLM provider"))?
            .as_str()
            .ok_or(anyhow!("Unknown LLM provider"))?))?;

        let model = definition
            .get("model")
            .ok_or(anyhow!("Missing model."))?
            .as_str()
            .ok_or(anyhow!("Missing model."))?
            .to_string();

        let credential = match definition.get("credential") {
            Some(credential) => Some(
                credential
                    .as_str()
                    .ok_or(anyhow!("Credentila must be a string."))?
                    .to_string(),
            ),
            None => None,
        };

        let prompt = definition
            .get("prompt")
            .ok_or(anyhow!("Missing prompt."))?
            .as_str()
            .ok_or(anyhow!("Missing prompt."))?
            .to_string();
        if prompt.is_empty() {
            return Err(anyhow!("Provided empty prompt"));
        }

        let temperature = match definition.get("temperature") {
            Some(temperature) => Some(
                temperature
                    .as_f64()
                    .ok_or(anyhow!("Temperature must be a float."))?,
            ),
            None => None,
        };

        let top_p = match definition.get("top_p") {
            Some(top_p) => Some(top_p.as_f64().ok_or(anyhow!("Top P must be a float"))?),
            None => None,
        };

        let max_tokens = match definition.get("max_tokens") {
            Some(max_tokens) => Some(
                max_tokens
                    .as_u64()
                    .ok_or(anyhow!("Max. tokens must be an unsigned integer"))?,
            ),
            None => None,
        };

        Ok(Self {
            provider,
            model,
            credential,
            prompt,
            temperature,
            top_p,
            max_tokens,
        })
    }

    pub fn from_json(action_name: &str, definition: serde_json::Value) -> Result<Self> {
        match Self::from_json_impl(definition) {
            Ok(http_request) => Ok(http_request),
            Err(e) => Err(anyhow!(
                "Configuration Error for AI Action \"{action_name}\": {e}"
            )),
        }
    }
}

impl ActionExecutor for AiAction {
    /// Outputs: {"output": "<llm-response>"}
    async fn execute(&self, context: &Context) -> Result<serde_json::Value> {
        let prompt = resolve_references(&self.prompt, context).await?.value;
        let prompt = prompt.as_str().unwrap().to_string();

        let client = ReqwestClient::new();

        let response = match self.provider {
            LLMProvider::Admyral => {
                let max_tokens = 512 as u64;
                openai::openai_inference(
                    OPENAI_CHAT_COMPLETION_API,
                    context,
                    &client,
                    &None,
                    &self.model,
                    &prompt,
                    self.temperature,
                    self.top_p,
                    Some(max_tokens),
                )
                .await?
            }
            LLMProvider::OpenAI => {
                if self.credential.is_none() {
                    return Err(anyhow!("Missing credential for OpenAI AI Action"));
                }
                openai::openai_inference(
                    OPENAI_CHAT_COMPLETION_API,
                    context,
                    &client,
                    &self.credential,
                    &self.model,
                    &prompt,
                    self.temperature,
                    self.top_p,
                    self.max_tokens,
                )
                .await?
            }
            LLMProvider::Anthropic => {
                if self.credential.is_none() {
                    return Err(anyhow!("Missing credential for Anthropic AI Action"));
                }
                anthropic::anthropic_inference(
                    context,
                    &client,
                    self.credential.as_ref().unwrap(),
                    &self.model,
                    &prompt,
                    self.temperature,
                    self.top_p,
                    self.max_tokens,
                )
                .await?
            }
            LLMProvider::Mistral => {
                if self.credential.is_none() {
                    return Err(anyhow!("Missing credential for Anthropic AI Action"));
                }
                openai::openai_inference(
                    MISTRAL_CHAT_COMPLETION_API,
                    context,
                    &client,
                    &self.credential,
                    &self.model,
                    &prompt,
                    self.temperature,
                    self.top_p,
                    self.max_tokens,
                )
                .await?
            }
            LLMProvider::AzureOpenAI => {
                if self.credential.is_none() {
                    return Err(anyhow!("Missing credential for Azure OpenAI AI Action"));
                }
                azure_openai::azure_openai_inference(
                    context,
                    &client,
                    self.credential.as_ref().unwrap(),
                    &self.model,
                    &prompt,
                    self.temperature,
                    self.top_p,
                    self.max_tokens,
                )
                .await?
            }
        };

        Ok(json!({
            "output": response
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_json() {
        let action_definition = json!({
            "provider": "MISTRAL",
            "model": "open-mixtral-8x7b",
            "credential": "mistral api key",
            "prompt": "You are a cybersecurity expert. Help me classify the following alert...",
            "temperature": 0.5,
            "top_p": 0.1,
            "max_tokens": 4096
        });
        let action = AiAction::from_json("My Action", action_definition);
        assert!(action.is_ok());
    }

    macro_rules! from_json_error_tests {
        ($($name:ident: $value:expr,)*) => {
        $(
            #[test]
            fn $name() {
                let (input, expected) = $value;
                let result = AiAction::from_json("My Action", input);
                assert!(result.is_err());
                assert_eq!(expected, result.err().unwrap().to_string());
            }
        )*
        }
    }

    from_json_error_tests! {
        invalid_provider: (
            json!({
                "provider": "ALEPH_ALPHA",
            }),
            "Configuration Error for AI Action \"My Action\": unknown variant `ALEPH_ALPHA`, expected one of `ADMYRAL`, `OPENAI`, `AZURE_OPENAI`, `MISTRAL`, `ANTHROPIC`"
        ),
        empty_prompt: (
            json!({
                "provider": "MISTRAL",
                "model": "open-mixtral-8x7b",
                "credential": "my credential",
                "prompt": ""
            }),
            "Configuration Error for AI Action \"My Action\": Provided empty prompt"
        ),
    }
}
