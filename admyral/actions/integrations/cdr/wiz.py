from typing import Annotated
from httpx import Client
from datetime import timedelta

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.utils.time import utc_now


def _fetch_token(
    client_id: str,
    client_secret: str,
    auth_url: str,
) -> str:
    with Client(
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    ) as client:
        response = client.post(
            auth_url,
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "audience": "wiz-api",
                "grant_type": "client_credentials",
            },
        )
        response.raise_for_status()
        return response.json()["access_token"]


def get_wiz_client(
    client_id: str,
    client_secret: str,
    auth_url: str,
    api_endpoint: str,
) -> Client:
    access_token = _fetch_token(client_id, client_secret, auth_url)
    return Client(
        base_url=api_endpoint,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
    )


_LIST_ALERTS_QUERY = """
query IssuesTable($filterBy: IssueFilters, $first: Int, $after: String, $orderBy: IssueOrder) {
    issues: issuesV2(filterBy: $filterBy, first: $first, after: $after, orderBy: $orderBy) {
        nodes {
            id
            control {
                id
                name
                description
                resolutionRecommendation
                securitySubCategories {
                    title
                    category {
                        name
                        framework {
                            name
                        }
                    }
                }
            }
            createdAt
            updatedAt
            sourceRule {
                id
                name
            }
            dueAt
            resolvedAt
            statusChangedAt
            project {
                id
                name
                slug
                businessUnit
                riskProfile {
                    businessImpact
                }
            }
            status
            severity
            type
            entitySnapshot {
                id
                type
                nativeType
                name
                status
                cloudPlatform
                cloudProviderURL
                providerId
                region
                resourceGroupExternalId
                subscriptionExternalId
                subscriptionName
                subscriptionTags
                tags
                externalId
            }
            notes {
                createdAt
                updatedAt
                text
                user {
                    name
                    email
                }
                serviceAccount {
                    name
                }
            }
            serviceTickets {
                externalId
                name
                url
            }
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}
"""


# TODO: OCSF schema
@action(
    display_name="List Alerts",
    display_namespace="Wiz",
    description="List alerts from Wiz. If no time range is provided, the alerts from the last 24 hours will be listed.",
    secrets_placeholders=["WIZ_SECRET"],
)
def list_wiz_alerts(
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    limit: Annotated[
        int,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 1000,
) -> list[dict[str, JsonValue]]:
    # https://github.com/criblio/collector-templates/blob/main/collectors/rest/wiz/collector-wiz-issues.json

    secret = ctx.get().secrets.get("WIZ_SECRET")
    client_id = secret["client_id"]
    client_secret = secret["client_secret"]
    auth_url = secret["auth_url"]
    api_endpoint = secret["api_endpoint"]

    with get_wiz_client(client_id, client_secret, auth_url, api_endpoint) as client:
        alerts = []

        end_cursor = None
        variables = {
            "filterBy": {
                "sourceRule": {"id": []},
                "relatedEntity": {"type": []},
                "status": ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"],
                "severity": ["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
                "type": [
                    "TOXIC_COMBINATION",
                    "THREAT_DETECTION",
                    "CLOUD_CONFIGURATION",
                ],
                "createdAt": {
                    "after": start_time
                    if start_time
                    else (utc_now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "before": end_time
                    if end_time
                    else utc_now().strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            },
            "first": 100,
        }

        while len(alerts) < limit:
            response = client.post(
                "",
                json={
                    "query": _LIST_ALERTS_QUERY,
                    "variables": variables,
                },
            )
            response.raise_for_status()
            data = response.json()["data"]["issues"]

            alerts.extend(data.get("nodes", []))

            if not data["pageInfo"]["hasNextPage"]:
                break

            if end_cursor := data["pageInfo"].get("endCursor"):
                variables["after"] = end_cursor
            else:
                break

        return alerts[:limit]
