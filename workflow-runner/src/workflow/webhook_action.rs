use super::ActionExecutor;
use crate::workflow::context::Context;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Webhook;

impl ActionExecutor for Webhook {
    async fn execute(&self, _context: &Context) -> Result<Option<serde_json::Value>> {
        Ok(None)
    }
}
