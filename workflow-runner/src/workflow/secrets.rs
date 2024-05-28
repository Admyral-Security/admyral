use super::context;
use anyhow::{anyhow, Result};
use serde::de::DeserializeOwned;

pub async fn fetch_credential<T>(credential_name: &str, context: &context::Context) -> Result<T>
where
    T: DeserializeOwned,
{
    let credential_secret = context
        .db
        .fetch_secret(&context.workflow_id, credential_name)
        .await?;
    let credential = match credential_secret {
        None => {
            let error_message = format!("Missing credentials: \"{credential_name}\"");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(secret) => match serde_json::from_str::<T>(&secret) {
            Err(e) => {
                tracing::error!("Error parsing credential: \"{e}\"");
                return Err(anyhow!("Received malformed credential."));
            }
            Ok(credential) => credential,
        },
    };
    Ok(credential)
}
