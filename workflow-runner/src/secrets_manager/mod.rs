use crate::postgres::Database;
use crate::workflow::http_client::HttpClient;
use anyhow::{anyhow, Result};
use moka::future::Cache;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use utils::fetch_secret_impl;

mod token_refresher;
mod utils;

const CACHE_MAX_CAPACITY: u64 = 1_024;
const CACHE_TTL_IN_SEC: u64 = 60 * 60;

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct OAuthToken {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64,
    pub scope: String,
    pub token_type: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct OAuthAccessToken {
    pub access_token: String,
    pub token_type: String,
    pub expires_at: u64,
}

#[derive(Clone)]
pub struct SecretsManager {
    db: Arc<dyn Database>,
    client: Arc<dyn HttpClient>,
    token_refresher: Arc<Mutex<token_refresher::TokenRefresher>>,
    oauth_access_token_cache: Cache<(String, String), OAuthAccessToken>,
}

impl SecretsManager {
    pub fn new(db: Arc<dyn Database>, client: Arc<dyn HttpClient>) -> Self {
        Self {
            db,
            client,
            token_refresher: Arc::new(Mutex::new(token_refresher::TokenRefresher)),
            oauth_access_token_cache: Cache::builder()
                .max_capacity(CACHE_MAX_CAPACITY)
                .time_to_live(Duration::from_secs(CACHE_TTL_IN_SEC))
                .build(),
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

    pub async fn fetch_oauth_access_token(
        &self,
        credential_name: &str,
        workflow_id: &str,
    ) -> Result<OAuthAccessToken> {
        // We first fetch the secrets from the store to check whether the credential exists
        let (stored_secret, integration_type_opt) =
            fetch_secret_impl::<serde_json::Value>(&*self.db, credential_name, workflow_id).await?;
        let integration_type = match integration_type_opt {
            Some(integration_type) => integration_type,
            None => {
                let error_message = format!("Credential \"{credential_name}\" has no integration type. Can't perform OAuth token refresh.");
                tracing::error!(error_message);
                return Err(anyhow!(error_message));
            }
        };

        // Check for existing and valid access token
        match integration_type.as_str() {
            // Case 1: Integration with stored refresh token?
            "MS_TEAMS" => {
                // Check whether we still have a valid token stored in the db
                let expires_at = stored_secret
                    .get("expires_at")
                    .expect("integration with oauth refresh token must have parameter expires_at stored!")
                    .as_u64()
                    .expect("expires_at must be an integer");

                if expires_at > utils::current_timestamp() {
                    // We have a valid token!
                    let access_token = stored_secret
                        .get("access_token")
                        .expect("integration with oauth refresh token must have parameter access_token stored!")
                        .as_str()
                        .expect("access_token must be a string");
                    let token_type = stored_secret
                        .get("token_type")
                        .expect("integration with oauth refresh token must have parameter token_type stored!")
                        .as_str()
                        .expect("token_type must be a string");

                    let token = OAuthAccessToken {
                        access_token: access_token.to_string(),
                        token_type: token_type.to_string(),
                        expires_at,
                    };

                    return Ok(token);
                }
            }
            // Case 2: For integrations without a refresh token, we check the cache for a valid access token
            "MS_DEFENDER_FOR_CLOUD" | "MS_DEFENDER" => {
                let cache_key = (credential_name.to_string(), workflow_id.to_string());
                if let Some(oauth_token) = self.oauth_access_token_cache.get(&cache_key).await {
                    if oauth_token.expires_at > utils::current_timestamp() {
                        return Ok(oauth_token);
                    }
                }
            }
            _ => {
                let error_message = format!("Unknown integration: \"{integration_type}\".");
                tracing::error!(error_message);
                return Err(anyhow!(error_message));
            }
        }

        tracing::info!("Performing OAuth token refresh - credential = \"{credential_name}\" , workflow = \"{workflow_id}\" , integratino_type = \"{integration_type}\"");

        let locked_token_refresher = self.token_refresher.lock().await;

        // Still invalid - check for valid token again and if not exists then refresh
        let token = match integration_type.as_str() {
            "MS_TEAMS" => {
                let oauth_token = locked_token_refresher
                    .refresh_with_refresh_token(
                        &*self.db,
                        &*self.client,
                        credential_name,
                        workflow_id,
                    )
                    .await?;
                OAuthAccessToken {
                    access_token: oauth_token.access_token,
                    token_type: oauth_token.token_type,
                    expires_at: oauth_token.expires_at,
                }
            }
            "MS_DEFENDER_FOR_CLOUD" | "MS_DEFENDER" => {
                let cache_key = (credential_name.to_string(), workflow_id.to_string());
                if let Some(oauth_token) = self.oauth_access_token_cache.get(&cache_key).await {
                    if oauth_token.expires_at > utils::current_timestamp() {
                        return Ok(oauth_token);
                    }
                }

                let token = locked_token_refresher
                    .refresh_without_refresh_token(
                        &stored_secret,
                        &integration_type,
                        &*self.client,
                        credential_name,
                        workflow_id,
                    )
                    .await?;

                // Update the cache
                self.oauth_access_token_cache
                    .insert(cache_key, token.clone())
                    .await;

                token
            }
            _ => {
                return Err(anyhow!(
                    "Unknown integration type {integration_type} for oauth token refreshing"
                ));
            }
        };

        Ok(token)
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
                    "token_type": "failed",
                    "access_token": "failed",
                    "refresh_token": "failed",
                    "expires_in": 3600
                }));
            }

            Ok(json!({
                "token_type": "Bearer",
                "access_token": "new_access_token",
                "refresh_token": "new_refresh_token",
                "expires_in": 3600
            }))
        }
    }

    struct MockDbMSTeams {
        secret: Mutex<RefCell<String>>,
    }
    impl MockDbMSTeams {
        fn new() -> Self {
            Self {
                secret: Mutex::new(RefCell::new(
                    "{\"access_token\": \"saasd\", \"refresh_token\": \"msads\", \"expires_at\": 1717267296, \"scope\": \"offline_access\", \"token_type\": \"Bearer\"}".to_string()
                )),
            }
        }
    }
    #[async_trait]
    impl Database for MockDbMSTeams {
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
    async fn test_fetch_oauth_access_token_ms_teams() {
        let secrets_manager = SecretsManager::new(
            Arc::new(MockDbMSTeams::new()),
            Arc::new(MockHttpClient::default()),
        );
        let result = secrets_manager
            .fetch_oauth_access_token("my_credential", "workflow_id")
            .await;
        assert!(result.is_ok());

        let oauth_token = result.unwrap();
        assert_eq!(oauth_token.access_token, "new_access_token");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_fetch_oauth_access_token_ms_teams_multi_threaded() {
        let secrets_manager = Arc::new(SecretsManager::new(
            Arc::new(MockDbMSTeams::new()),
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
                        .fetch_oauth_access_token("my_credential", "workflow_id")
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
        }
    }

    struct MockDbMSDefenderForCloud;
    #[async_trait]
    impl Database for MockDbMSDefenderForCloud {
        async fn fetch_secret(
            &self,
            _workflow_id: &str,
            _credential_name: &str,
        ) -> Result<Option<Credential>> {
            Ok(Some(Credential {
                secret: "{\"TENANT_ID\": \"my-tenant\", \"CLIENT_ID\": \"my-client\", \"CLIENT_SECRET\": \"my-secret\"}".to_string(),
                credential_type: Some("MS_DEFENDER_FOR_CLOUD".to_string()),
            }))
        }
    }

    #[tokio::test]
    async fn test_fetch_oauth_access_token_ms_defender_for_cloud() {
        let secrets_manager = SecretsManager::new(
            Arc::new(MockDbMSDefenderForCloud),
            Arc::new(MockHttpClient::default()),
        );
        let result = secrets_manager
            .fetch_oauth_access_token("my_credential", "workflow_id")
            .await;
        assert!(result.is_ok());

        let oauth_token = result.unwrap();
        assert_eq!(oauth_token.access_token, "new_access_token");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_fetch_oauth_access_token_ms_defender_for_cloud_multi_threaded() {
        let secrets_manager = Arc::new(SecretsManager::new(
            Arc::new(MockDbMSDefenderForCloud),
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
                        .fetch_oauth_access_token("my_credential", "workflow_id")
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
        }
    }
}
