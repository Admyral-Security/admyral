use super::{
    context::Context,
    http_client::{HttpClient, ReqwestClient},
    ActionExecutor,
};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

mod alienvault_otx;
mod grey_noise;
mod jira;
mod ms_defender;
mod ms_defender_for_cloud;
mod ms_teams;
mod opsgenie;
mod phish_report;
mod pulsedive;
mod slack;
mod threatpost;
mod virustotal;
mod yaraify;

pub trait IntegrationExecutor {
    async fn execute(
        &self,
        client: &dyn HttpClient,
        context: &Context,
        api: &str,
        credential_name: &Option<String>,
        parameters: &HashMap<String, serde_json::Value>,
    ) -> Result<serde_json::Value>;
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IntegrationType {
    VirusTotal,
    AlienvaultOtx,
    Threatpost,
    Yaraify,
    PhishReport,
    Slack,
    Jira,
    MsTeams,
    MsDefenderForCloud,
    Pulsedive,
    MsDefender,
    GreyNoise,
    Opsgenie,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Integration {
    integration_type: IntegrationType,
    api: String,
    params: HashMap<String, serde_json::Value>,
    credential: Option<String>,
}

impl Integration {
    fn from_json_impl(definition: serde_json::Value) -> Result<Self> {
        // Manual parsing to provide the user with better error messages

        let integration_type = serde_json::from_value::<IntegrationType>(json!(definition
            .get("integration_type")
            .ok_or(anyhow!("Integration Type must be selected."))?
            .as_str()
            .ok_or(anyhow!("Integration Type must be selected."))?))?;

        let api = definition
            .get("api")
            .ok_or(anyhow!("An API must be selected."))?
            .as_str()
            .ok_or(anyhow!("An API must be selected."))?
            .to_string();

        let params = definition
            .get("params")
            .ok_or(anyhow!("Missing Parameters"))?
            .as_object()
            .ok_or(anyhow!("Parameters must be a JSON object"))?
            .clone()
            .into_iter()
            .collect::<HashMap<String, serde_json::Value>>();

        let credential = match definition.get("credential") {
            Some(credential) => Some(
                credential
                    .as_str()
                    .ok_or(anyhow!("Credential must be a string"))?
                    .to_string(),
            ),
            None => None,
        };

        Ok(Self {
            integration_type,
            api,
            params,
            credential,
        })
    }

    pub fn from_json(action_name: &str, definition: serde_json::Value) -> Result<Self> {
        match Self::from_json_impl(definition) {
            Ok(integration) => Ok(integration),
            Err(e) => Err(anyhow!(
                "Configuration Error for Integration Action \"{action_name}\": {e}"
            )),
        }
    }
}

impl ActionExecutor for Integration {
    async fn execute(&self, context: &Context) -> Result<serde_json::Value> {
        let client = ReqwestClient::new();

        match self.integration_type {
            IntegrationType::VirusTotal => {
                virustotal::VirusTotalExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::AlienvaultOtx => {
                alienvault_otx::AlienvaultOtxExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::Threatpost => {
                threatpost::ThreatpostExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::Yaraify => {
                yaraify::YaraifyExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::PhishReport => {
                phish_report::PhishReportExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::Slack => {
                slack::SlackExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::Jira => {
                jira::JiraExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::MsTeams => {
                ms_teams::MsTeamsExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::MsDefenderForCloud => {
                ms_defender_for_cloud::MsDefenderForCloudExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::Pulsedive => {
                pulsedive::PulsediveExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::MsDefender => {
                ms_defender::MsDefenderExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::GreyNoise => {
                grey_noise::GreyNoiseExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
            IntegrationType::Opsgenie => {
                opsgenie::OpsgenieExecutor
                    .execute(&client, context, &self.api, &self.credential, &self.params)
                    .await
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use maplit::hashmap;
    use serde_json::json;

    #[test]
    fn test_deserialization() {
        let action_definition = json!({
            "api": "GET_A_FILE_REPORT",
            "integration_type": "VIRUS_TOTAL",
            "params": {
                "hash": "<<webhook.body.hash>>"
            },
            "credential": "My VirusTotal API Key"
        });

        let parsed_integration = serde_json::from_value::<Integration>(action_definition)
            .expect("Should not fail to parse!");

        assert_eq!(
            parsed_integration.integration_type,
            IntegrationType::VirusTotal
        );
        assert_eq!(parsed_integration.api, "GET_A_FILE_REPORT".to_string());
        assert_eq!(
            parsed_integration.params,
            hashmap! { "hash".to_string() => json!("<<webhook.body.hash>>") }
        );
        assert_eq!(
            parsed_integration.credential,
            Some("My VirusTotal API Key".to_string())
        );
    }
}
