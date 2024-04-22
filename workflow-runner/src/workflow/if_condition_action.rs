use super::ActionExecutor;
use super::{context::Context, reference_resolution::resolve_references};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Operator {
    Equals,
    NotEquals,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
}

impl std::fmt::Display for Operator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Equals => write!(f, "=="),
            Self::NotEquals => write!(f, "!="),
            Self::GreaterThan => write!(f, ">"),
            Self::GreaterThanOrEqual => write!(f, ">="),
            Self::LessThan => write!(f, "<"),
            Self::LessThanOrEqual => write!(f, "<="),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionExpression {
    lhs: serde_json::Value,
    rhs: serde_json::Value,
    operator: Operator,
}

#[derive(Debug, Clone, Copy)]
enum NumberPairTypePromotionResult {
    Int { lhs: i64, rhs: i64 },
    Float { lhs: f64, rhs: f64 },
}

impl NumberPairTypePromotionResult {
    fn promote(lhs: serde_json::Number, rhs: serde_json::Number) -> Self {
        if !lhs.is_f64() && !rhs.is_f64() {
            let convert = |num: serde_json::Number| -> i64 {
                if num.is_i64() {
                    num.as_i64().unwrap()
                } else {
                    num.as_u64().unwrap() as i64
                }
            };

            let lhs = convert(lhs);
            let rhs = convert(rhs);

            return NumberPairTypePromotionResult::Int { lhs, rhs };
        }

        let convert = |num: serde_json::Number| -> f64 {
            if num.is_f64() {
                num.as_f64().unwrap()
            } else if num.is_i64() {
                num.as_i64().unwrap() as f64
            } else {
                num.as_u64().unwrap() as f64
            }
        };

        let lhs = convert(lhs);
        let rhs = convert(rhs);

        NumberPairTypePromotionResult::Float { lhs, rhs }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum JsonType {
    Null,
    Bool,
    Number,
    String,
    Object,
    Array,
}

impl JsonType {
    fn get_type(value: &serde_json::Value) -> JsonType {
        match value {
            serde_json::Value::Null => JsonType::Null,
            serde_json::Value::Bool(_) => JsonType::Bool,
            serde_json::Value::Number(_) => JsonType::Number,
            serde_json::Value::String(_) => JsonType::String,
            serde_json::Value::Object(_) => JsonType::Object,
            serde_json::Value::Array(_) => JsonType::Array,
        }
    }
}

impl std::fmt::Display for JsonType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Null => write!(f, "Null"),
            Self::Bool => write!(f, "Bool"),
            Self::Number => write!(f, "Number"),
            Self::String => write!(f, "String"),
            Self::Object => write!(f, "Object"),
            Self::Array => write!(f, "Array"),
        }
    }
}

fn apply_comparison<T: PartialOrd + PartialEq>(lhs: T, rhs: T, operator: Operator) -> bool {
    match operator {
        Operator::Equals => lhs == rhs,
        Operator::NotEquals => lhs != rhs,
        Operator::GreaterThan => lhs > rhs,
        Operator::GreaterThanOrEqual => lhs >= rhs,
        Operator::LessThan => lhs < rhs,
        Operator::LessThanOrEqual => lhs <= rhs,
        _ => unreachable!("Used operator is not a comparison!"),
    }
}

fn cast_down_if_possible(value: serde_json::Value) -> serde_json::Value {
    if !value.is_string() {
        return value;
    }

    let s = value.as_str().unwrap().to_lowercase();

    // Bool?
    if s == "true" || s == "false" {
        return json!(s == "true");
    }

    // Int?
    if let Ok(num) = s.parse::<i64>() {
        return json!(num);
    }

    // Float?
    if let Ok(num) = s.parse::<f64>() {
        return json!(num);
    }

    return value;
}

fn bool_to_number_value(bool_json: serde_json::Value) -> serde_json::Value {
    assert!(bool_json.is_boolean());
    serde_json::Value::Number(serde_json::Number::from(bool_json.as_bool().unwrap() as i64))
}

fn to_number(value: serde_json::Value) -> serde_json::Number {
    assert!(value.is_boolean() || value.is_number());
    let value = if value.is_boolean() {
        bool_to_number_value(value)
    } else {
        value
    };
    value.as_number().unwrap().clone()
}

fn to_string(value: serde_json::Value) -> String {
    assert!(value.is_boolean() || value.is_number() || value.is_string());
    match value {
        serde_json::Value::Bool(val) => val.to_string(),
        serde_json::Value::Number(val) => val.to_string(),
        serde_json::Value::String(val) => val,
        _ => unreachable!("Only bool, number, and string supported in to_string!"),
    }
}

fn execute_condition(
    lhs: serde_json::Value,
    rhs: serde_json::Value,
    operator: Operator,
) -> Result<bool> {
    // Try to cast the input as much down as possible: string -> number / bool
    let lhs = cast_down_if_possible(lhs);
    let rhs = cast_down_if_possible(rhs);

    // Determine data type used for condition evaluation
    let lhs_type = JsonType::get_type(&lhs);
    let rhs_type = JsonType::get_type(&rhs);

    let result = match (lhs_type, rhs_type) {
        // Case 1: evaluate as bool
        (JsonType::Bool, JsonType::Bool) => {
            apply_comparison(lhs.as_bool().unwrap(), rhs.as_bool().unwrap(), operator)
        }
        // Case 2: evaluate as number
        // If at least one side is a number and the other one a number or bool, then the other side is casted to a number
        // and the evaluation data type is number.
        (JsonType::Number | JsonType::Bool, JsonType::Number | JsonType::Bool) => {
            let lhs = to_number(lhs);
            let rhs = to_number(rhs);

            let result = NumberPairTypePromotionResult::promote(lhs, rhs);
            match result {
                // Execute as integer
                NumberPairTypePromotionResult::Int { lhs, rhs } => {
                    apply_comparison(lhs, rhs, operator)
                }
                // Execute as float
                NumberPairTypePromotionResult::Float { lhs, rhs } => {
                    apply_comparison(lhs, rhs, operator)
                }
            }
        }
        // Case 3: evaluate as string
        // If at least one side is a string, then the other side is casted to a string and the evaluation data type is string.
        (
            JsonType::String | JsonType::Number | JsonType::Bool,
            JsonType::String | JsonType::Number | JsonType::Bool,
        ) => {
            let lhs = to_string(lhs);
            let rhs = to_string(rhs);
            apply_comparison(lhs, rhs, operator)
        }
        // We don't support arrays, objects, and null in a condition
        _ => {
            return Err(anyhow!(
                "Invalid comparison: {lhs_type} {operator} {rhs_type}"
            ))
        }
    };

    Ok(result)
}

impl ConditionExpression {
    pub async fn evaluate(&self, context: &Context) -> Result<bool> {
        let lhs = resolve_references(&self.lhs, context).await?;
        let rhs = resolve_references(&self.rhs, context).await?;

        execute_condition(lhs, rhs, self.operator)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IfCondition {
    /// conditions represents the following expression: conditions[0] AND conditions[1] ... AND conditions[n-1]
    conditions: Vec<ConditionExpression>,
}

impl ActionExecutor for IfCondition {
    /// Resolve reference possible in lhs, rhs
    /// Returns JSON of the following form: { "condition_result": <condition-evaluation-result> }
    async fn execute(&self, context: &Context) -> Result<Option<serde_json::Value>> {
        let mut result = true;

        for condition_expression in &self.conditions {
            result = condition_expression.evaluate(context).await?;

            if !result {
                break;
            }
        }

        Ok(Some(json!({
            "condition_result": result
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_comparison_numbers() {
        let lhs = json!(10);
        let rhs = json!(20);
        // Input: 10 < 20
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::LessThan).unwrap(),
            true
        );
        // Input: 10 > 20
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::GreaterThan).unwrap(),
            false
        );
        // Input: 10 == 20
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::Equals).unwrap(),
            false
        );
        // Input: 10 == 10
        assert_eq!(
            execute_condition(lhs.clone(), lhs.clone(), Operator::Equals).unwrap(),
            true
        );

        // String numbers are casted to number data type.
        let lhs = json!("20");
        let rhs = json!("34");
        // Input: "20" < "34"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::LessThan).unwrap(),
            true
        );
        // Input: "20" <= "34"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::LessThanOrEqual).unwrap(),
            true
        );
        // Input: "20" > "34"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::GreaterThan).unwrap(),
            false
        );
        // Input: "20" >= "34"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::GreaterThanOrEqual).unwrap(),
            false
        );
        // Input: "20" == "34"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::Equals).unwrap(),
            false
        );
        // Input: "20" < "20"
        assert_eq!(
            execute_condition(lhs.clone(), lhs.clone(), Operator::Equals).unwrap(),
            true
        );
        // Input: "20" != "34"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::NotEquals).unwrap(),
            true
        );
    }

    #[test]
    fn test_comparison_strings() {
        let lhs = json!("test");
        let rhs = json!("test");
        let diff_rhs = json!("diff");
        let number_string = json!("1234");
        let bool_string = json!("true");

        // Input: "test" == "test"
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::Equals).unwrap(),
            true
        );
        // Input: "test" != "diff"
        assert_eq!(
            execute_condition(lhs.clone(), diff_rhs.clone(), Operator::NotEquals).unwrap(),
            true
        );
        // Input: "test" < "diff"
        assert_eq!(
            execute_condition(lhs.clone(), diff_rhs.clone(), Operator::LessThan).unwrap(),
            false
        );
        // Input: "test" <= "diff"
        assert_eq!(
            execute_condition(lhs.clone(), diff_rhs.clone(), Operator::LessThanOrEqual).unwrap(),
            false
        );
        // Input: "test" == "1234"
        assert_eq!(
            execute_condition(lhs.clone(), number_string.clone(), Operator::Equals).unwrap(),
            false
        );
        // Input: "test" == "true"
        assert_eq!(
            execute_condition(lhs.clone(), bool_string.clone(), Operator::Equals).unwrap(),
            false
        );
    }

    #[test]
    fn test_comparison_bools() {
        let lhs = json!(true);
        let rhs = json!(false);
        // Input: true == false
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::Equals).unwrap(),
            false
        );
        // Input: true == true
        assert_eq!(
            execute_condition(lhs.clone(), json!(true), Operator::Equals).unwrap(),
            true
        );
        // Input: true > false
        assert_eq!(
            execute_condition(lhs.clone(), rhs.clone(), Operator::GreaterThan).unwrap(),
            true
        );
    }

    #[test]
    fn test_promoted_number_comparison() {
        let lhs = json!(10.0);
        let rhs = json!(10);
        assert_eq!(execute_condition(lhs, rhs, Operator::Equals).unwrap(), true);

        let lhs = json!(false);
        let rhs = json!(10);
        assert_eq!(
            execute_condition(lhs, rhs, Operator::LessThan).unwrap(),
            true
        );

        let lhs = json!(true);
        let rhs = json!(0);
        assert_eq!(
            execute_condition(lhs, rhs, Operator::GreaterThan).unwrap(),
            true
        );
    }

    #[test]
    fn test_mixed_type_comparison() {
        let lhs = json!("10");
        let rhs = json!(10);
        assert_eq!(execute_condition(lhs, rhs, Operator::Equals).unwrap(), true);

        let lhs = json!(true);
        let rhs = json!("true");
        assert_eq!(execute_condition(lhs, rhs, Operator::Equals).unwrap(), true);

        let lhs = json!(true);
        let rhs = json!("TRUE");
        assert_eq!(execute_condition(lhs, rhs, Operator::Equals).unwrap(), true);
    }

    #[test]
    fn test_invalid_comparison() {
        let lhs = json!([1, 2, 3]);
        let rhs = json!([1, 2, 3]);
        assert!(execute_condition(lhs, rhs, Operator::Equals).is_err());
    }
}
