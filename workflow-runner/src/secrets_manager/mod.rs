use crate::postgres::Database;
use crate::workflow::http_client::HttpClient;
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
    client: Arc<dyn HttpClient>,
    token_refresher: Arc<Mutex<token_refresher::TokenRefresher>>,
}

// TODO: caching could make sense here
impl SecretsManager {
    pub fn new(db: Arc<dyn Database>, client: Arc<dyn HttpClient>) -> Self {
        Self {
            db,
            client,
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
        if oauth_token.expires_at >= utils::current_timestamp() {
            // token is valid!
            return Ok(oauth_token);
        }

        // The token is expired. Hence, we need to refresh it!
        // However, for a credential, we must synchronize the token refresh across tasks

        tracing::info!("Performing OAuth token refresh - credential = \"{credential_name}\" , workflow = \"{workflow_id}\"");

        // acquire lock to only allow a single writer => make more finegrained in the future
        // TODO: if there are two workflow runners, then we must also synchronize token refreshing => DB lock? separate secrets manager service?
        let locked_token_refresher = self.token_refresher.lock().await;
        locked_token_refresher
            .refresh(&*self.db, &*self.client, credential_name, workflow_id)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::{Credential, Database};
    use crate::workflow::http_client::RequestBodyType;
    use async_trait::async_trait;
    use serde_json::json;
    use std::collections::HashMap;
    use std::sync::Mutex;
    use std::{cell::RefCell, sync::Arc};
    use tokio::sync::Barrier;
    use tokio::task;

    #[derive(Default)]
    struct MockHttpClient {
        state: Mutex<RefCell<usize>>,
    }
    #[async_trait]
    impl HttpClient for MockHttpClient {
        async fn post(
            &self,
            _url: &str,
            _headers: HashMap<String, String>,
            _body: RequestBodyType,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            let lock_guard = self.state.lock().unwrap();
            let mut state = lock_guard.borrow_mut();
            *state += 1;

            if *state > 1 {
                return Ok(json!({
                    "access_token": "failed",
                    "refresh_token": "failed",
                    "expires_in": 3600
                }));
            }

            Ok(json!({
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "expires_in": 3600
            }))
        }
    }

    struct MockDb {
        secret: Mutex<RefCell<String>>,
    }
    impl MockDb {
        fn new() -> Self {
            Self {
                secret: Mutex::new(RefCell::new(
                    "{\"access_token\": \"saasd\", \"refresh_token\": \"msads\", \"expires_at\": 1717267296, \"scope\": \"offline_access\", \"token_type\": \"Bearer\"}".to_string()
                ))
            }
        }
    }
    #[async_trait]
    impl Database for MockDb {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            let lock_guard = self.secret.lock().unwrap();
            let secret = lock_guard.borrow();

            Ok(Some(Credential {
                secret: secret.clone(),
                credential_type: Some("MS_TEAMS".to_string()),
            }))
        }

        async fn update_secret(
            &self,
            workflow_id: &str,
            credential_name: &str,
            secret: &str,
        ) -> Result<()> {
            let lock_guard = self.secret.lock().unwrap();
            let mut current_secret = lock_guard.borrow_mut();

            *current_secret = secret.to_string();

            Ok(())
        }
    }

    #[tokio::test]
    async fn test_fetch_oauth_token_and_refresh_if_necessary() {
        let secrets_manager =
            SecretsManager::new(Arc::new(MockDb::new()), Arc::new(MockHttpClient::default()));
        let result = secrets_manager
            .fetch_oauth_token_and_refresh_if_necessary("my_credential", "workflow_id")
            .await;
        assert!(result.is_ok());

        let oauth_token = result.unwrap();
        assert_eq!(oauth_token.access_token, "new_access_token");
        assert_eq!(oauth_token.refresh_token, "new_refresh_token");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_fetch_oauth_token_and_refresh_if_necessary_multi_threaded() {
        let secrets_manager = Arc::new(SecretsManager::new(
            Arc::new(MockDb::new()),
            Arc::new(MockHttpClient::default()),
        ));

        let num_tasks = 10;
        let barrier = Arc::new(Barrier::new(num_tasks));

        let handles = (0..num_tasks)
            .map(|_| {
                let barrier_clone = Arc::clone(&barrier);
                let secrets_manager_clone = Arc::clone(&secrets_manager);

                let handle = task::spawn(async move {
                    // let the task wait until all tasks are launched
                    barrier_clone.wait().await;

                    secrets_manager_clone
                        .fetch_oauth_token_and_refresh_if_necessary("my_credential", "workflow_id")
                        .await
                });
                handle
            })
            .collect::<Vec<_>>();

        for handle in handles {
            let result = handle.await.unwrap();
            assert!(result.is_ok());

            let oauth_token = result.unwrap();
            assert_eq!(oauth_token.access_token, "new_access_token");
            assert_eq!(oauth_token.refresh_token, "new_refresh_token");
        }
    }
}
