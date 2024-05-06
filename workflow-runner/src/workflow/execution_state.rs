use super::ReferenceHandle;
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

lazy_static! {
    static ref ARRAY_INDEX_ACCESS_REGEX: Regex = Regex::new(r"\[\d+\]").unwrap();
}

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
                Some(obj) => {
                    match ARRAY_INDEX_ACCESS_REGEX.find(key) {
                        None => match obj.get(key) {
                            None => return None,
                            Some(next_value) => value = next_value,
                        },
                        Some(array_index_matching_result) => {
                            // We have an array index access!

                            // Split key into index and array key
                            let index_access = array_index_matching_result.as_str();
                            let index = index_access[1..index_access.len() - 1]
                                .parse::<usize>()
                                .expect("Index must be a valid digit");
                            let array_key = &key[..key.len() - index_access.len()];

                            // Access next key. We expect it to be an array!
                            match obj.get(array_key) {
                                None => return None,
                                Some(next_value) => match next_value {
                                    serde_json::Value::Array(arr) => {
                                        if index >= arr.len() {
                                            // Index out of bounds!
                                            return None;
                                        }
                                        value = &arr[index];
                                    }
                                    _ => return None,
                                },
                            }
                        }
                    }
                }
            }
        }

        Some(value.clone())
    }

    pub fn store(&mut self, node_reference_handle: String, output: serde_json::Value) {
        // TODO: check whether node id is unique? or should we just assume it?
        self.state.insert(node_reference_handle, output);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_access_path() {
        let data = json!({
            "data": ["a", "b"]
        });
        let mut state = ExecutionState::default();
        state.store("test".to_string(), data);

        let access_path = "test.data".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_some());
        assert_eq!(json!(["a", "b"]), result.unwrap());

        let access_path = "test.another_one".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_none());

        let access_path = "test.data[0]".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_some());
        assert_eq!(json!("a"), result.unwrap());

        let access_path = "test.data[1]".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_some());
        assert_eq!(json!("b"), result.unwrap());

        let access_path = "test.data[2]".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_none());

        let data = json!({
                "body": {
                    "id": "case_dkj7kmgpkbgg",
                    "url": "http://iujdhsndjfks.com",
                    "tags": [],
                    "created": "2024-05-02T22:10:26.972271Z",
                    "resolved": false,
                    "pending_actions": [
                        {
                            "params": {
                                "role": "hosting"
                            },
                            "report_uri": "mailto:abuse@trellian.com",
                            "description": "Report to TRELLIAN-AS-AP"
                        }
                    ]
                }
        });
        let mut state = ExecutionState::default();
        state.store("retrieve_case_from_phish_report".to_string(), data);

        let access_path =
            "retrieve_case_from_phish_report.body.pending_actions[0].description".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_some());
        assert_eq!(json!("Report to TRELLIAN-AS-AP"), result.unwrap());

        let access_path =
            "retrieve_case_from_phish_report.body.pending_actions[0].report_uri".to_string();
        let result = state.get_from_access_path(access_path);
        assert!(result.is_some());
        assert_eq!(json!("mailto:abuse@trellian.com"), result.unwrap());
    }
}
