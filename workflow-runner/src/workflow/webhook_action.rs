use super::{ActionExecutor, ReferenceHandle};
use crate::workflow::context::Context;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Webhook {
    reference_handle: ReferenceHandle,
}

impl ActionExecutor for Webhook {
    fn get_reference_handle(&self) -> &ReferenceHandle {
        &self.reference_handle
    }

    async fn execute(&self, context: &mut Context) -> Result<Option<serde_json::Value>> {
        tracing::info!(
            "Executing Webhook {} of workflow {}",
            self.reference_handle,
            context.workflow_id
        );
        Ok(None)
    }
}
