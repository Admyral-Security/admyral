use crate::postgres::fetch_secret;

use super::context::Context;
use anyhow::Result;
use futures::future::{join_all, BoxFuture, FutureExt};
use lazy_static::lazy_static;
use regex::Regex;
use serde_json::json;
use std::collections::{HashMap, HashSet};

lazy_static! {
    static ref REFERENCE_REGEX: Regex = Regex::new(r"<<.*>>").unwrap();
}

const CREDENTIAL_PREFIX: &str = "CREDENTIAL.";

fn json_value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Array(arr) => format!(
            "[{}]",
            arr.iter()
                .map(json_value_to_string)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        serde_json::Value::Object(obj) => format!(
            "{{ {} }}",
            obj.iter()
                .map(|(k, v)| format!("\"{}\": {}", k, json_value_to_string(v)))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        serde_json::Value::Null => "null".to_string(),
    }
}

// TODO: handle reference marker escaping
pub fn resolve_references<'a>(
    value: &'a serde_json::Value,
    context: &'a Context,
) -> BoxFuture<'a, Result<serde_json::Value>> {
    async move {
        // For Object and Array, we traverse recursively to the string values since they contain
        // the references.
        match value {
            serde_json::Value::Object(map) => {
                let futures = map
                    .iter()
                    .map(|(key, val)| async {
                        let resolved_reference = resolve_references(val, context).await?;
                        Ok((key.clone(), resolved_reference))
                    })
                    .collect::<Vec<_>>();
                let result = join_all(futures).await;
                let result: Result<Vec<_>> = result.into_iter().collect();
                let result = result?;
                return Ok(serde_json::Value::Object(result.into_iter().collect()));
            }
            serde_json::Value::Array(arr) => {
                let futures = arr
                    .iter()
                    .map(|val| async { Ok(resolve_references(val, context).await?) })
                    .collect::<Vec<_>>();
                let result = join_all(futures).await;
                let result: Result<Vec<_>> = result.into_iter().collect();
                let result = result?;
                return Ok(serde_json::Value::Array(result));
            }
            serde_json::Value::String(_) => {
                // don't break. continue in this case.
            }
            _ => return Ok(value.clone()),
        }

        let s = value.as_str().unwrap();

        let mut total_length_of_references = 0;
        let references = REFERENCE_REGEX
            .find_iter(s)
            .map(|reference_match| {
                let result = reference_match.as_str();
                total_length_of_references += result.len();
                result
            })
            .collect::<HashSet<&str>>();

        if references.is_empty() {
            // Nothing to do here.
            return Ok(value.clone());
        }

        let futures = references
            .into_iter()
            .map(|reference| async move {
                let cleaned_reference = reference
                    .replace("<<", "")
                    .replace(">>", "")
                    .trim()
                    .to_string();

                // TODO: handle formulas

                // Credential access
                if cleaned_reference.starts_with(CREDENTIAL_PREFIX) {
                    let credential_name = &cleaned_reference[CREDENTIAL_PREFIX.len()..];
                    let secret =
                        match fetch_secret(&context.pg_pool, &context.workflow_id, credential_name)
                            .await?
                        {
                            Some(secret) => secret,
                            None => "".to_string(),
                        };
                    return Ok((reference, json!(secret)));
                }

                // Data reference
                let resolved_reference = match context
                    .execution_state
                    .get_from_access_path(cleaned_reference)
                {
                    Some(result) => result,
                    None => json!(""),
                };
                Ok((reference, resolved_reference))
            })
            .collect::<Vec<_>>();

        let result = join_all(futures).await;
        let result: Result<Vec<_>> = result.into_iter().collect();
        let resolved_references = result?
            .into_iter()
            .collect::<HashMap<&str, serde_json::Value>>();

        // Check whether s is exactly a single reference. then, there is no need for constructing an output string.
        // E.g. we might want to reference a number type, then we leave the number type as is.
        if resolved_references.len() == 1 && s.len() == total_length_of_references {
            return Ok(resolved_references.into_iter().next().unwrap().1);
        }

        // If the input s is not exactly a single reference, then there is some context around the
        // reference which is a text. Hence, the result type is again a string.
        // We construct the output by replacing the references with the resolved values transformed into a string.
        let mut output = s.to_string();
        for (reference_key, resolved) in resolved_references {
            output = output.replace(reference_key, &json_value_to_string(&resolved));
        }
        Ok(serde_json::Value::String(output))
    }
    .boxed()
}
