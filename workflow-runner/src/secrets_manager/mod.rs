use crate::postgres::Database;
use anyhow::Result;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

mod token_refresher;
mod utils;

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct OAuthToken {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64,
    pub scope: String,
    pub token_type: String,
}

#[derive(Clone)]
pub struct SecretsManager {
    db: Arc<dyn Database>,
    token_refresher: Arc<Mutex<token_refresher::TokenRefresher>>,
}

// TODO: caching could make sense here
impl SecretsManager {
    pub fn new(db: Arc<dyn Database>) -> Self {
        Self {
            db,
            token_refresher: Arc::new(Mutex::new(token_refresher::TokenRefresher)),
        }
    }

    pub async fn fetch_secret<T>(&self, credential_name: &str, workflow_id: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        match utils::fetch_secret_impl::<T>(&*self.db, credential_name, workflow_id).await {
            Ok((secret, _)) => Ok(secret),
            Err(e) => Err(e),
        }
    }

    pub async fn fetch_oauth_token_and_refresh_if_necessary(
        &self,
        credential_name: &str,
        workflow_id: &str,
    ) -> Result<OAuthToken> {
        let oauth_token = self
            .fetch_secret::<OAuthToken>(credential_name, workflow_id)
            .await?;

        // We check if the token is expired
        if oauth_token.expires_at < utils::current_timestamp() {
            // token is valid!
            return Ok(oauth_token);
        }

        // The token is expired. Hence, we need to refresh it!
        // However, for a credential, we must synchronize the token refresh across tasks

        // acquire lock to only allow a single writer => make more finegrained in the future
        // TODO: if there are two workflow runners, then we must also synchronize token refreshing => DB lock? separate secrets manager service?
        let locked_token_refresher = self.token_refresher.lock().await;
        locked_token_refresher
            .refresh(&*self.db, credential_name, workflow_id)
            .await
    }
}
