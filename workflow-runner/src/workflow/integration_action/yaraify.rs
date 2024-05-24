use super::IntegrationExecutor;
use crate::workflow::{
    context,
    http_client::{HttpClient, PostRequest},
    utils::{get_string_parameter, ParameterType},
};
use anyhow::{anyhow, Result};
use maplit::hashmap;
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

const YARAIFY: &str = "YARAify";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct YaraifyExecutor;

impl IntegrationExecutor for YaraifyExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &context::Context,
        api: &str,
        _credential_name: &str,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value> {
        match api {
            "QUERY_A_FILE_HASH" => query_a_file_hash(client, context, parameters).await,
            "QUERY_YARA_RULE" => query_yara_rule(client, context, parameters).await,
            "QUERY_CLAMAV_SIGNATURE" => query_clamav_signature(client, context, parameters).await,
            "QUERY_IMPHASH" => query_imphash(client, context, parameters).await,
            "QUERY_TLSH" => query_tlsh(client, context, parameters).await,
            "QUERY_TELFHASH" => query_telfhash(client, context, parameters).await,
            "QUERY_GIMPHASH" => query_gimphash(client, context, parameters).await,
            "QUERY_ICON_DHASH" => query_icon_dhash(client, context, parameters).await,
            "LIST_RECENTLY_DEPLOYED_YARA_RULES" => list_recently_deployed_yara_rules(client).await,
            _ => return Err(anyhow!("API {api} not implemented for {YARAIFY}.")),
        }
    }
}

async fn query_yaraify(
    client: &dyn HttpClient,
    query: &str,
    search_term_opt: Option<&str>,
) -> Result<serde_json::Value> {
    let body = match search_term_opt {
        Some(search_term) => json!({"query": query, "search_term": search_term}),
        None => json!({"query": query}),
    };

    let response = client
        .post(
            "https://yaraify-api.abuse.ch/api/v1/",
            HashMap::new(),
            PostRequest::Json { body },
            200,
            format!("Error: Failed to call {YARAIFY} API"),
        )
        .await?;

    Ok(response)
}

// https://yaraify.abuse.ch/api/#query-filehash
async fn query_a_file_hash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let file_hash = get_string_parameter(
        "hash",
        YARAIFY,
        "QUERY_A_FILE_HASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("file_hash is required");
    query_yaraify(client, "lookup_hash", Some(&file_hash)).await
}

// https://yaraify.abuse.ch/api/#yara
async fn query_yara_rule(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let yara_rule = get_string_parameter(
        "yara",
        YARAIFY,
        "QUERY_YARA_RULE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("yara is required");
    query_yaraify(client, "get_yara", Some(&yara_rule)).await
}

// https://yaraify.abuse.ch/api/#clamav
async fn query_clamav_signature(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let clamav = get_string_parameter(
        "clamav",
        YARAIFY,
        "QUERY_CLAMAV_SIGNATURE",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("clamav is required");
    query_yaraify(client, "get_clamav", Some(&clamav)).await
}

// https://yaraify.abuse.ch/api/#imphash
async fn query_imphash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let imphash = get_string_parameter(
        "imphash",
        YARAIFY,
        "QUERY_IMPHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("imphash is required");
    query_yaraify(client, "get_imphash", Some(&imphash)).await
}

// https://yaraify.abuse.ch/api/#tlsh
async fn query_tlsh(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let tlsh = get_string_parameter(
        "tlsh",
        YARAIFY,
        "QUERY_TLSH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("tlsh is required");
    query_yaraify(client, "get_tlsh", Some(&tlsh)).await
}

// https://yaraify.abuse.ch/api/#telfhash
async fn query_telfhash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let telfhash = get_string_parameter(
        "telfhash",
        YARAIFY,
        "QUERY_TELFHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("telfhash is required");
    query_yaraify(client, "get_telfhash", Some(&telfhash)).await
}

// https://yaraify.abuse.ch/api/#gimphash
async fn query_gimphash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let gimphash = get_string_parameter(
        "gimphash",
        YARAIFY,
        "QUERY_GIMPHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("gimphash is required");
    query_yaraify(client, "get_gimphash", Some(&gimphash)).await
}

// https://yaraify.abuse.ch/api/#dhash_icon
async fn query_icon_dhash(
    client: &dyn HttpClient,
    context: &context::Context,
    parameters: &HashMap<String, serde_json::Value>,
) -> Result<serde_json::Value> {
    let icon_dhash = get_string_parameter(
        "icon_dhash",
        YARAIFY,
        "QUERY_ICON_DHASH",
        parameters,
        context,
        ParameterType::Required,
    )
    .await?
    .expect("icon_dhash is required");
    query_yaraify(client, "get_dhash_icon", Some(&icon_dhash)).await
}

// https://yaraify.abuse.ch/api/#yara-recent
async fn list_recently_deployed_yara_rules(client: &dyn HttpClient) -> Result<serde_json::Value> {
    query_yaraify(client, "recent_yararules", None).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::postgres::Database;
    use async_trait::async_trait;
    use serde_json::json;
    use std::sync::Arc;

    struct MockHttpClient;
    #[async_trait]
    impl HttpClient for MockHttpClient {
        async fn post(
            &self,
            _url: &str,
            _headers: HashMap<String, String>,
            _body: PostRequest,
            _expected_response_status: u16,
            _error_message: String,
        ) -> Result<serde_json::Value> {
            Ok(serde_json::json!({"result": "ok"}))
        }
    }

    struct MockDb;
    #[async_trait]
    impl Database for MockDb {}

    async fn setup() -> (Arc<MockHttpClient>, context::Context) {
        let db = Arc::new(MockDb);
        let context =
            context::Context::init("ddd54f25-0537-4e40-ab96-c93beee543de".to_string(), None, db)
                .await
                .unwrap();
        (Arc::new(MockHttpClient), context)
    }

    #[tokio::test]
    async fn test_query_a_file_hash() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_A_FILE_HASH",
                "credentials",
                &hashmap! {
                    "hash".to_string() => json!("c0202cf6aeab8437c638533d14563d35")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_yara_rule() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_YARA_RULE",
                "credentials",
                &hashmap! {
                    "yara".to_string() => json!("MALWARE_Win_Neshta")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_clamav_signature() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_CLAMAV_SIGNATURE",
                "credentials",
                &hashmap! {
                    "clamav".to_string() => json!("Win.Dropper.Gh0stRAT-9789290-0")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_imphash() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_IMPHASH",
                "credentials",
                &hashmap! {
                    "imphash".to_string() => json!("680b9682922177224183342c299d809f")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_tlsh() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_TLSH",
                "credentials",
                &hashmap! {
                    "tlsh".to_string() => json!("T140551236C8E05951CAEFD73315186AF983182477CCC9E5BB0E6B36D62CB6431A36B06D")
                }
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_telfhash() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_TELFHASH",
                "credentials",
                &hashmap! {
                    "telfhash".to_string() => json!("t1dd211d716b2195266ea0cd9088eca7b2512c97072349df33cf31849c24140aeea3ac4f")
                }
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_gimphash() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_GIMPHASH",
                "credentials",
                &hashmap! {
                    "gimphash".to_string() => json!("a081e2fab5999d99ed6be718af55e93df171d14bc83c7ca5fdc0907edba0d338c")
                }
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_query_icon_dhash() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "QUERY_ICON_DHASH",
                "credentials",
                &hashmap! {
                    "icon_dhash".to_string() => json!("d8d0d4d8ececece4")
                },
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }

    #[tokio::test]
    async fn test_list_recently_deployed_yara_rules() {
        let (client, context) = setup().await;
        let result = YaraifyExecutor
            .execute(
                &*client,
                &context,
                "LIST_RECENTLY_DEPLOYED_YARA_RULES",
                "credentials",
                &HashMap::new(),
            )
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), json!({ "result": "ok" }));
    }
}
