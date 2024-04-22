use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use futures::future::join_all;
use lazy_static::lazy_static;
use reqwest::header::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{context::Context, reference_resolution::resolve_references, ActionExecutor};

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

impl ActionExecutor for SendEmail {
    async fn execute(&self, context: &Context) -> Result<Option<serde_json::Value>> {
        let recipients = self
            .recipients
            .iter()
            .map(|recipient| async move { resolve_references(&json!(recipient), context).await })
            .collect::<Vec<_>>();
        let recipients = join_all(recipients).await;
        let recipients: Result<Vec<serde_json::Value>> = recipients.into_iter().collect();
        let recipients = recipients?
            .into_iter()
            .filter(|recipient| recipient.is_string())
            .map(|recipient| recipient.as_str().unwrap().to_string())
            .collect::<Vec<String>>();

        let subject = resolve_references(&json!(self.subject), context).await?;

        let body = resolve_references(&json!(self.body), context).await?;

        let sender_name = resolve_references(&json!(self.sender_name), context).await?;

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
            let x = response.json::<serde_json::Value>().await?;
            // tracing::error!("Failed to send email: {:?}", response);
            return Err(anyhow!("Failed to send email!"));
        }

        Ok(Some(body))
    }
}
