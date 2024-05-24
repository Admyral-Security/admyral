use super::context::Context;
use anyhow::Result;
use futures::future::join_all;
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
                .map(|v| {
                    // Edge case: strings are the only value which must we wrapped in \"\" again
                    if let serde_json::Value::String(s) = v {
                        format!("\"{s}\"")
                    } else {
                        json_value_to_string(v)
                    }
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        serde_json::Value::Object(obj) => format!(
            "{{ {} }}",
            obj.iter()
                .map(|(k, v)| {
                    // Edge case: strings are the only value which must we wrapped in \"\" again
                    let value = if let serde_json::Value::String(s) = v {
                        format!("\"{s}\"")
                    } else {
                        json_value_to_string(v)
                    };
                    format!("\"{}\": {}", k, value)
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        serde_json::Value::Null => "null".to_string(),
    }
}

fn string_to_json_value(s: &str) -> Result<serde_json::Value> {
    // Attempt to parse the input directly as JSON
    serde_json::from_str(s).or_else(|_| {
        // If the direct parsing fails, we interpret it as string
        Ok(json!(s))
    })
}

#[derive(Debug, Clone)]
pub struct ResolveReferenceResult {
    pub value: serde_json::Value,
    /// true if we have an input such as "<<some_reference>>" and <<some_reference>> does not exist
    pub does_not_exist_and_is_single_reference_only: bool,
}

pub async fn resolve_references(value: &str, context: &Context) -> Result<ResolveReferenceResult> {
    let value = value.trim();

    let mut total_length_of_references = 0;
    let references = REFERENCE_REGEX
        .find_iter(value)
        .map(|reference_match| {
            let result = reference_match.as_str();
            total_length_of_references += result.len();
            result
        })
        .collect::<HashSet<&str>>();

    if references.is_empty() {
        // Nothing to do here.
        return Ok(ResolveReferenceResult {
            value: json!(value),
            does_not_exist_and_is_single_reference_only: false,
        });
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
                let secret = match context
                    .db
                    .fetch_secret(&context.workflow_id, credential_name)
                    .await?
                {
                    Some(secret) => secret,
                    None => "".to_string(),
                };
                return Ok((reference, (secret, false)));
            }

            // Data reference
            let (resolved_reference, does_not_exist) = match context
                .execution_state
                .get_from_access_path(cleaned_reference)
            {
                Some(result) => (json_value_to_string(&result), false),
                None => ("".to_string(), true),
            };
            Ok((reference, (resolved_reference, does_not_exist)))
        })
        .collect::<Vec<_>>();

    let result = join_all(futures).await;
    let result: Result<Vec<_>> = result.into_iter().collect();
    let resolved_references = result?
        .into_iter()
        .collect::<HashMap<&str, (String, bool)>>();

    let num_of_references = resolved_references.len();

    // Replace references
    let mut does_not_exist = false;
    let mut output = value.to_string();
    for (reference_key, (resolved, resolved_does_not_exist)) in resolved_references {
        output = output.replace(reference_key, &resolved);
        does_not_exist = does_not_exist || resolved_does_not_exist;
    }

    // We transform the output to JSON again
    let output_value = string_to_json_value(&output)?;

    let does_not_exist_and_is_single_reference_only = does_not_exist
        && num_of_references == 1
        && value.starts_with("<<")
        && value.ends_with(">>");

    Ok(ResolveReferenceResult {
        value: output_value,
        does_not_exist_and_is_single_reference_only,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_value_to_string() {
        let value = json!({
            "a": "abc",
            "b": 123,
            "c": {
                "abc": ["e", "f", "g"]
            }
        });
        let expected = "{ \"a\": \"abc\", \"b\": 123, \"c\": { \"abc\": [\"e\", \"f\", \"g\"] } }";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!("abcdefg");
        let expected = "abcdefg";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!(["a", "b"]);
        let expected = "[\"a\", \"b\"]";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!([123, 123, 123]);
        let expected = "[123, 123, 123]";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!([{"a": "cedf"}, {"b": true}, {"d": ["abc"]}]);
        let expected = "[{ \"a\": \"cedf\" }, { \"b\": true }, { \"d\": [\"abc\"] }]";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!(true);
        let expected = "true";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!(1.23);
        let expected = "1.23";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);

        let value = json!(123);
        let expected = "123";
        let result = json_value_to_string(&value);
        assert_eq!(expected, result);
    }

    #[test]
    fn test_string_to_json_value() {
        let value = "hello world";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!(value.to_string()), result.unwrap());

        let value = "hello world\nwhat's up?";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!(value.to_string()), result.unwrap());

        let value = "true";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!(true), result.unwrap());

        let value = "\"true\"";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!("true"), result.unwrap());

        let value = "100";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!(100), result.unwrap());

        let value = "\"100\"";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!("100"), result.unwrap());

        let value = "100.111";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!(100.111), result.unwrap());

        let value = "[\"a\",\"b\",\"c\"]";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(json!(vec!["a", "b", "c"]), result.unwrap());

        let value = "{\"a\": { \"b\": [\"1\", \"2\"] }, \"c\": 3, \"d\": true, \"e\": \"abc\" }";
        let result = string_to_json_value(&value);
        assert!(result.is_ok());
        assert_eq!(
            json!({
                "a": {
                    "b": vec!["1", "2"]
                },
                "c": 3,
                "d": true,
                "e": "abc"
            }),
            result.unwrap()
        );
    }
}
