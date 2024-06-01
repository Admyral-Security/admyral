use crate::postgres::Database;
use anyhow::{anyhow, Result};
use serde::de::DeserializeOwned;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

pub async fn fetch_secret_impl<T>(
    db: &dyn Database,
    credential_name: &str,
    workflow_id: &str,
) -> Result<(T, Option<String>)>
where
    T: DeserializeOwned,
{
    let credential_secret_opt = db.fetch_secret(workflow_id, credential_name).await?;

    match credential_secret_opt {
        None => {
            let error_message = format!("Missing credentials: \"{credential_name}\"");
            tracing::error!(error_message);
            return Err(anyhow!(error_message));
        }
        Some(credential) => match serde_json::from_str::<T>(&credential.secret) {
            Err(e) => {
                tracing::error!("Error parsing credential: \"{e}\"");
                return Err(anyhow!("Received malformed credential."));
            }
            Ok(secret) => Ok((secret, credential.credential_type)),
        },
    }
}
