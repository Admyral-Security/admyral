from msgraph import GraphServiceClient
from azure.identity import ClientSecretCredential
from enum import Enum
from msgraph.generated.security.alerts_v2.alerts_v2_request_builder import (
    Alerts_v2RequestBuilder,
)
from msgraph.generated.models.security.alert import Alert
from kiota_serialization_json.json_serialization_writer import JsonSerializationWriter
import json

from admyral.typings import JsonValue
from admyral.utils.future_executor import execute_future
from admyral.utils.collections import is_not_empty


def get_ms_graph_client(
    tenant_id: str, client_id: str, client_secret: str
) -> GraphServiceClient:
    """
    Create an MS Graph client using the client credentials provider (OAuth 2.0)

    Sources:
        - https://learn.microsoft.com/en-us/graph/sdks/choose-authentication-providers?tabs=python#client-credentials-provider
        - https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
    """
    return GraphServiceClient(
        ClientSecretCredential(
            tenant_id=tenant_id, client_id=client_id, client_secret=client_secret
        ),
        ["https://graph.microsoft.com/.default"],
    )


# Note: also exists as auto-generated enum in msgraph.generated.models.security.service_source.py
class MsSecurityGraphAlertServiceSource(str, Enum):
    MS_DEFENDER_FOR_ENDPOINT = "microsoftDefenderForEndpoint"
    MS_DEFENDER_FOR_IDENTITY = "microsoftDefenderForIdentity"
    MS_DEFENDER_FOR_CLOUD_APPS = "microsoftDefenderForCloudApps"
    MS_DEFENDER_FOR_OFFICE365 = "microsoftDefenderForOffice365"
    MS_365_DEFENDER = "microsoft365Defender"
    AZURE_AD_IDENTITY_PROTECTION = "azureAdIdentityProtection"
    MS_APP_GOVERNANCE = "microsoftAppGovernance"
    DATA_LOSS_PREVENTION = "dataLossPrevention"
    MS_DEFENDER_FOR_CLOUD = "microsoftDefenderForCloud"
    MS_SENTINEL = "microsoftSentinel"


def _alert_to_json(alert: Alert) -> JsonValue:
    writer = JsonSerializationWriter()
    alert.serialize(writer)
    return json.loads(writer.get_serialized_content().decode("utf-8"))


def ms_graph_list_alerts_v2(
    tenant_id: str,
    client_id: str,
    client_secret: str,
    start_time: str | None = None,
    end_time: str | None = None,
    service_source: MsSecurityGraphAlertServiceSource | None = None,
    limit: int = 100,
) -> list[dict[str, JsonValue]]:
    """
    Fetch alerts from the Microsoft Graph Security API using the List Alerts v2 endpoint.

    Sources:
        - https://learn.microsoft.com/en-us/graph/api/security-list-alerts_v2?view=graph-rest-1.0&tabs=python
        - https://learn.microsoft.com/en-us/graph/auth-v2-service?tabs=http
        - https://github.com/microsoftgraph/msgraph-sdk-python/blob/main/msgraph/generated/security/alerts_v2/alerts_v2_request_builder.py
        - https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
    """
    client = get_ms_graph_client(
        tenant_id=tenant_id, client_id=client_id, client_secret=client_secret
    )

    filter_params = []
    if service_source:
        filter_params.append(f"serviceSource eq '{service_source.value}'")
    if start_time:
        filter_params.append(f"createdDateTime ge {start_time}")
    if end_time:
        filter_params.append(f"createdDateTime le {end_time}")

    query_params = Alerts_v2RequestBuilder.Alerts_v2RequestBuilderGetQueryParameters(
        filter=" and ".join(filter_params) if is_not_empty(filter_params) else None,
    )
    request_config = (
        Alerts_v2RequestBuilder.Alerts_v2RequestBuilderGetRequestConfiguration(
            query_parameters=query_params
        )
    )

    alert_collection = execute_future(
        client.security.alerts_v2.get(request_configuration=request_config)
    )

    alerts = [_alert_to_json(alert) for alert in alert_collection.value]

    # handle pagination
    while len(alerts) < limit and alert_collection and alert_collection.odata_next_link:
        alert_collection = execute_future(
            client.security.alerts_v2.with_url(alert_collection.odata_next_link).get(
                request_configuration=request_config
            )
        )
        alerts.extend([_alert_to_json(alert) for alert in alert_collection.value])

    return alerts[:limit]
