use super::ActionExecutor;
use crate::workflow::context::Context;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Webhook {
    reference_handle: String,
}

impl ActionExecutor for Webhook {
    async fn execute(&self, context: &mut Context) -> Result<()> {
        // No op.
        Ok(())
    }
}
