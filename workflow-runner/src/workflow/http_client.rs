use async_trait::async_trait;
use reqwest::Error;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum PostRequest {
    Form { params: HashMap<String, String> },
    Json { body: serde_json::Value },
}

#[async_trait]
trait HttpClient {
    async fn get(&self, url: &str, headers: &HashMap<String, String>) -> Result<serde_json::Value, Error>;

    async fn post(&self, url: &str, headers: &HashMap<String, String>, body: PostRequest) -> Result<serde_json::Value, Error>;

    async fn put(&self, url: &str, headers: &HashMap<String, String>, body: PostRequest) -> Result<serde_json::Value, Error>;
}
