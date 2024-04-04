use super::context::Context;
use lazy_static::lazy_static;
use regex::Regex;
use serde_json::json;
use std::collections::{HashMap, HashSet};

lazy_static! {
    static ref REFERENCE_REGEX: Regex = Regex::new(r"<<.*>>").unwrap();
}

// TODO: unit test
pub fn resolve_references(value: &serde_json::Value, context: &Context) -> serde_json::Value {
    // For Object and Array, we traverse recursively to the string values since they contain
    // the references.
    match value {
        serde_json::Value::Object(map) => {
            return serde_json::Value::Object(
                map.iter()
                    .map(|(key, val)| (key.clone(), resolve_references(val, context)))
                    .collect(),
            );
        }
        serde_json::Value::Array(arr) => {
            return serde_json::Value::Array(
                arr.iter()
                    .map(|val| resolve_references(val, context))
                    .collect(),
            );
        }
        serde_json::Value::String(_) => {
            // don't break. continue in this case.
        }
        _ => return value.clone(),
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
        return value.clone();
    }

    let resolved_references = references
        .into_iter()
        .map(|reference| {
            let access_path = reference
                .replace("<<", "")
                .replace(">>", "")
                .trim()
                .to_string();
            // TODO: handle credentials
            // TODO: handle formulas
            let resolved_reference = match context.execution_state.get_from_access_path(access_path)
            {
                Some(result) => result,
                None => json!(""),
            };
            (reference, resolved_reference)
        })
        .collect::<HashMap<&str, serde_json::Value>>();

    // Check whether s is exactly a single reference. then, there is no need for constructing an output string.
    // E.g. we might want to reference a number type, then we leave the number type as is.
    if resolved_references.len() == 1 && s.len() == total_length_of_references {
        return resolved_references.into_iter().next().unwrap().1;
    }

    // If the input s is not exactly a single reference, then there is some context around the
    // reference which is a text. Hence, the result type is again a string.
    // We construct the output by replacing the references with the resolved values transformed into a string.
    let mut output = s.to_string();
    for (reference_key, resolved) in resolved_references {
        output = output.replace(reference_key, &resolved.to_string());
    }
    serde_json::Value::String(output)
}
