use super::ReferenceHandle;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecutionState {
    /// reference handle of an action node to output mapping
    state: HashMap<ReferenceHandle, serde_json::Value>,
}

impl ExecutionState {
    pub fn get_from_access_path(&self, path: String) -> Option<serde_json::Value> {
        let mut iter = path.split(".");

        let mut value = match iter.next() {
            Some(node_id) => match self.state.get(node_id) {
                Some(value) => value,
                None => return None,
            },
            None => return None,
        };

        for key in iter {
            match value.as_object() {
                None => return None,
                Some(obj) => match obj.get(key) {
                    None => return None,
                    Some(next_value) => value = next_value,
                },
            }
        }

        Some(value.clone())
    }

    pub fn store(&mut self, node_reference_handle: String, output: serde_json::Value) {
        // TODO: check whether node id is unique? or should we just assume it?
        self.state.insert(node_reference_handle, output);
    }
}
