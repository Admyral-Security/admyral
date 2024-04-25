use super::ActionExecutor;
use crate::workflow::context::Context;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Webhook {
    input: Option<serde_json::Value>,
}

impl Webhook {
    pub fn set_input(&mut self, input: serde_json::Value) {
        self.input = Some(input);
    }
}

impl ActionExecutor for Webhook {
    async fn execute(&self, _context: &Context) -> Result<serde_json::Value> {
        let result = match &self.input {
            Some(input) => input.clone(),
            None => json!({}),
        };
        Ok(result)
    }
}
