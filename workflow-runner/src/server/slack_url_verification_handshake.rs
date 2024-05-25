use anyhow::Result;
use axum::http::HeaderMap;
use serde_json::json;

// Documentation: https://api.slack.com/apis/events-api#handshake
pub fn handle_slack_url_verification_handshake(
    headers: HeaderMap,
    body: &serde_json::Value,
) -> Result<Option<serde_json::Value>> {
    if let Some(user_agent) = headers.get("user-agent") {
        if user_agent.to_str()? == "Slackbot 1.0 (+https://api.slack.com/robots)" {
            tracing::info!("Received message from Slackbot user-agent. Checking whether we have a Slack URL Verification Handshake. Received body: {}", body.to_string());
            if let Some(body_ref) = body.as_object() {
                if let Some(request_type) = body_ref.get("type") {
                    if request_type.is_string()
                        && request_type.as_str().unwrap() == "url_verification"
                    {
                        tracing::info!(
                            "Received Slack URL Verification Handshake. Returning challenge"
                        );
                        let challenge = body_ref
                            .get("challenge")
                            .expect("challenge must exist")
                            .as_str()
                            .expect("challenge must be a string");
                        return Ok(Some(json!({"challenge": challenge})));
                    }
                }
            }
        }
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;
    use serde_json::json;

    #[test]
    fn test_handle_slack_url_verification_handshake_valid_handshake_request() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "user-agent",
            HeaderValue::from_str("Slackbot 1.0 (+https://api.slack.com/robots)").unwrap(),
        );
        let body = json!({
            "token": "Jhj5dZrVaK7ZwHHjRyZWjbDl",
            "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
            "type": "url_verification"
        });

        let result = handle_slack_url_verification_handshake(headers, &body);
        assert!(result.is_ok());
        let opt = result.unwrap();
        assert!(opt.is_some());
        assert_eq!(
            opt.unwrap(),
            json!({"challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P"})
        );
    }

    #[test]
    fn test_handle_slack_url_verification_handshake_not_a_handshake_request() {
        let headers = HeaderMap::new();
        let body = json!({
            "some": "other request"
        });

        let result = handle_slack_url_verification_handshake(headers, &body);
        assert!(result.is_ok());
        let opt = result.unwrap();
        assert!(opt.is_none());
    }
}
