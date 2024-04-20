use super::shared_state::SharedState;
use crate::postgres::{fetch_webhook_secret, is_user_valid};
use anyhow::Result;
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, status::StatusCode},
    response::{IntoResponse, Response},
    Json, RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{Pool, Postgres};
use std::borrow::Borrow;
use std::fmt::Display;

lazy_static! {
    static ref JWT_SECRET: DecodingKey = DecodingKey::from_secret(
        std::env::var("JWT_SECRET")
            .expect("Missing environment variable JWT_SECRET")
            .as_bytes()
    );
}

#[derive(Debug)]
pub enum AuthError {
    InvalidToken,
    UserDoesNotExist,
    InternalServerError,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AuthError::InvalidToken => (StatusCode::BAD_REQUEST, "Invalid token"),
            AuthError::UserDoesNotExist => (StatusCode::BAD_REQUEST, "User does not exist"),
            AuthError::InternalServerError => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
        };
        let body = Json(json!({
            "error": error_message
        }));
        (status, body).into_response()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
    pub iss: String,
    pub aud: String,
    pub email: String,
    pub phone: String,
    pub app_metadata: serde_json::Value,
    pub user_metadata: serde_json::Value,
    pub role: String,
    pub aal: String,
    pub amr: serde_json::Value,
    pub session_id: String,
    pub is_anonymous: bool,
}

impl Display for JwtClaims {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "User Id: {} Email: {}", self.sub, self.email)
    }
}

// https://github.com/tokio-rs/axum/blob/main/examples/jwt/src/main.rs
#[async_trait]
impl FromRequestParts<SharedState> for JwtClaims {
    type Rejection = AuthError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &SharedState,
    ) -> Result<Self, Self::Rejection> {
        // Extract the token from the authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AuthError::InvalidToken)?;

        // Decode the user data
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_audience(&["authenticated"]);
        let token_data =
            decode::<JwtClaims>(bearer.token(), &JWT_SECRET, &validation).map_err(|e| {
                tracing::error!("Failed to validate JWT: {e}");
                AuthError::InvalidToken
            })?;

        // we additionally check whether the user id exists
        if !is_user_valid(state.db_pool.borrow(), &token_data.claims.sub)
            .await
            .map_err(|_| AuthError::InternalServerError)?
        {
            tracing::warn!("Valid token used by invalid user!");
            return Err(AuthError::UserDoesNotExist);
        }

        Ok(token_data.claims)
    }
}

#[derive(Debug, Serialize)]
struct AuthBody {
    access_token: String,
    token_type: String,
}

pub async fn authenticate_webhook(
    pool: &Pool<Postgres>,
    webhook_id: &str,
    secret: &str,
) -> Result<bool> {
    match fetch_webhook_secret(pool, webhook_id).await? {
        None => Ok(false),
        Some(fetched_secret) => Ok(fetched_secret == secret),
    }
}
