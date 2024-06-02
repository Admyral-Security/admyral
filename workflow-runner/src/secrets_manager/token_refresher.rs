use crate::postgres::Database;
use crate::workflow::http_client::HttpClient;
use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use lazy_static::lazy_static;
use maplit::hashmap;

use super::utils::{current_timestamp, fetch_secret_impl};
use super::OAuthToken;

lazy_static! {
    static ref MS_TEAMS_OAUTH_CLIENT_ID: AsyncOnce<String> = AsyncOnce::new(async {
        std::env::var("MS_TEAMS_OAUTH_CLIENT_ID")
            .expect("Missing environment variable MS_TEAMS_OAUTH_CLIENT_ID")
    });
    static ref MS_TEAMS_OAUTH_CLIENT_SECRET: AsyncOnce<String> = AsyncOnce::new(async {
        std::env::var("MS_TEAMS_OAUTH_CLIENT_SECRET")
            .expect("Missing environment variable MS_TEAMS_OAUTH_CLIENT_SECRET")
    });
}

pub struct TokenRefresher;

impl TokenRefresher {
    pub async fn refresh(
        &self,
        db: &dyn Database,
        client: &dyn HttpClient,
        credential_name: &str,
        workflow_id: &str,
    ) -> Result<OAuthToken> {
        let (mut oauth_token, integration_type_opt) =
            fetch_secret_impl::<OAuthToken>(db, credential_name, workflow_id).await?;
        if oauth_token.expires_at >= current_timestamp() {
            // while we were waiting for the lock, the token was already updated!
            return Ok(oauth_token);
        }

        // the token is still not valid. hence, we refresh it

        tracing::info!(
            "Refreshing token for \"{credential_name}\" for workflow id \"{workflow_id}\""
        );

        let integration_type = match integration_type_opt {
            Some(integration_type) => integration_type,
            None => {
                let error_message = format!("Credential \"{credential_name}\" has no integration type. Can't perform OAuth token refresh.");
                tracing::error!(error_message);
                return Err(anyhow!(error_message));
            }
        };

        // determine the correct parameters for the current integration
        let (params, url) = match integration_type.as_str() {
            "MS_TEAMS" => {
                // Docs: https://learn.microsoft.com/en-us/graph/auth-v2-user?tabs=curl#use-the-microsoft-authentication-library-msal
                let client_id = MS_TEAMS_OAUTH_CLIENT_ID.get().await;
                let client_secret = MS_TEAMS_OAUTH_CLIENT_SECRET.get().await;
                let params = hashmap! {
                    "client_id".to_string() => client_id.clone(),
                    "scope".to_string() => oauth_token.scope.to_string(),
                    "refresh_token".to_string() => oauth_token.refresh_token.to_string(),
                    "grant_type".to_string() => "refresh_token".to_string(),
                    "client_secret".to_string() => client_secret.to_string()
                };
                let api_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
                (params, api_url)
            }
            _ => {
                let error_message = format!("Credential {credential_name} requires integration {integration_type}. Can't perform OAuth token refresh on unknown integration.");
                tracing::error!(error_message);
                return Err(anyhow!(error_message));
            }
        };

        let now = current_timestamp();

        let res = client
            .post(
                url,
                hashmap! {
                    "Content-type".to_string() => "application/x-www-form-urlencoded".to_string()
                },
                crate::workflow::http_client::RequestBodyType::Form { params },
                200,
                format!("Error: Failed to refresh token!"),
            )
            .await?;

        let expires_in = res
            .get("expires_in")
            .expect("refresh token response must have paramter expires_in!")
            .as_u64()
            .expect("expires_in must be unsinged integer");
        let new_access_token = res
            .get("access_token")
            .expect("refresh token response must have paramter access_token!")
            .as_str()
            .expect("access_token must be string");
        let new_refresh_token = res
            .get("refresh_token")
            .expect("refresh token response must have paramter refresh_token!")
            .as_str()
            .expect("refresh_token must be string");

        oauth_token.access_token = new_access_token.to_string();
        oauth_token.refresh_token = new_refresh_token.to_string();
        oauth_token.expires_at = now + expires_in;

        // update credential store
        db.update_secret(
            workflow_id,
            credential_name,
            &serde_json::to_string(&oauth_token)?,
        )
        .await?;

        Ok(oauth_token)
    }
}
