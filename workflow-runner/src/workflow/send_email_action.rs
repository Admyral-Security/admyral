use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use futures::future::join_all;
use lazy_static::lazy_static;
use reqwest::header::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{
    context::Context,
    reference_resolution::{resolve_references, ResolveReferenceResult},
    ActionExecutor,
};

lazy_static! {
    static ref REQ_CLIENT: reqwest::Client = reqwest::Client::new();
    static ref RESEND_API_KEY: AsyncOnce<String> = AsyncOnce::new(async {
        std::env::var("RESEND_API_KEY").expect("Missing environment variable RESEND_API_KEY")
    });
    static ref RESEND_EMAIL: AsyncOnce<String> = AsyncOnce::new(async {
        std::env::var("RESEND_EMAIL").expect("Missing environment variable RESEND_EMAIL")
    });
}

const RESEND_SEND_EMAIL_API: &str = "https://api.resend.com/emails";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendEmail {
    recipients: Vec<String>,
    subject: String,
    body: String,
    sender_name: String,
}

impl SendEmail {
    fn from_json_impl(definition: serde_json::Value) -> Result<Self> {
        // Manual parsing to provide the user with better error messages

        let recipients = serde_json::from_value::<Vec<String>>(
            definition
                .get("recipients")
                .ok_or(anyhow!("Integration Type not configured correctly"))?
                .clone(),
        )?;
        if recipients.is_empty() {
            return Err(anyhow!("Missing recipient"));
        }

        let subject = definition
            .get("subject")
            .ok_or(anyhow!("Subject not configured correctly"))?
            .as_str()
            .ok_or(anyhow!("Subject not configured correctly"))?
            .to_string();
        if subject.is_empty() {
            return Err(anyhow!("Empty subject"));
        }

        let body = definition
            .get("body")
            .ok_or(anyhow!("Body not configured correctly"))?
            .as_str()
            .ok_or(anyhow!("Body not configured correctly"))?
            .to_string();

        let sender_name = definition
            .get("sender_name")
            .ok_or(anyhow!("Sender Name not configured correctly"))?
            .as_str()
            .ok_or(anyhow!("Sender Name not configured correctly"))?
            .to_string();
        if sender_name.is_empty() {
            return Err(anyhow!("Empty sender name"));
        }

        Ok(Self {
            recipients,
            subject,
            body,
            sender_name,
        })
    }

    pub fn from_json(action_name: &str, definition: serde_json::Value) -> Result<Self> {
        match Self::from_json_impl(definition) {
            Ok(integration) => Ok(integration),
            Err(e) => Err(anyhow!(
                "Configuration Error for Send Email Action \"{action_name}\": {e}"
            )),
        }
    }
}

impl ActionExecutor for SendEmail {
    async fn execute(&self, context: &Context) -> Result<serde_json::Value> {
        let recipients = self
            .recipients
            .iter()
            .map(|recipient| async move { resolve_references(&recipient, context).await })
            .collect::<Vec<_>>();
        let recipients = join_all(recipients).await;
        let recipients: Result<Vec<ResolveReferenceResult>> = recipients.into_iter().collect();
        let recipients = recipients?
            .into_iter()
            .filter(|recipient| recipient.value.is_string())
            .map(|recipient| recipient.value.as_str().unwrap().to_string())
            .collect::<Vec<String>>();

        let subject = resolve_references(&self.subject, context).await?.value;

        let body = resolve_references(&self.body, context).await?.value;

        let sender_name = resolve_references(&self.sender_name, context).await?.value;

        let client = REQ_CLIENT.clone();

        let mut headers = HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        let api_key = RESEND_API_KEY.get().await;
        headers.insert(
            "Authorization",
            format!("Bearer {}", api_key).parse().unwrap(),
        );

        let sender_email = RESEND_EMAIL.get().await;

        let body = json!({
            "from": format!("{sender_name} <{sender_email}>"),
            "to": recipients,
            "subject": subject,
            "text": body
        });

        let response = client
            .post(RESEND_SEND_EMAIL_API)
            .headers(headers)
            .json(&body)
            .send()
            .await?;

        if response.status().as_u16() != 200 {
            let result = response.json::<serde_json::Value>().await?;
            tracing::error!("Failed to send email: {:?}", result);
            return Err(anyhow!("Failed to send email!"));
        }

        Ok(body)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_json() {
        let action_definition = json!({
            "recipients": ["mail@admyral.dev"],
            "subject": "test 123",
            "body": "hello",
            "sender_name": "Hello Admyral"
        });
        let action = SendEmail::from_json("My Action", action_definition);
        assert!(action.is_ok());
    }

    macro_rules! from_json_error_tests {
        ($($name:ident: $value:expr,)*) => {
        $(
            #[test]
            fn $name() {
                let (input, expected) = $value;
                let result = SendEmail::from_json("My Action", input);
                assert!(result.is_err());
                assert_eq!(expected, result.err().unwrap().to_string());
            }
        )*
        }
    }

    from_json_error_tests! {
        missing_recipient: (
            json!({
                "recipients": []
            }),
            "Configuration Error for Send Email Action \"My Action\": Missing recipient"
        ),
        empty_subject: (
            json!({
                "recipients": ["mail@admyral.dev"],
                "subject": "",
                "body": "hello",
                "sender_name": "Hello Admyral"
            }),
            "Configuration Error for Send Email Action \"My Action\": Empty subject"
        ),
        missing_body: (
            json!({
                "recipients": ["mail@admyral.dev"],
                "subject": "test 123",
                "sender_name": "Hello Admyral"
            }),
            "Configuration Error for Send Email Action \"My Action\": Body not configured correctly"
        ),
        empty_sender: (
            json!({
                "recipients": ["mail@admyral.dev"],
                "subject": "test 123",
                "body": "hello",
                "sender_name": ""
            }),
            "Configuration Error for Send Email Action \"My Action\": Empty sender name"
        ),
    }
}
