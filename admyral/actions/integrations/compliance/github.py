"""
Setup:
Follow setup instruction from the github documentation to create personal access token
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
"""

from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.utils.collections import is_not_empty


def get_github_enterprise_client(access_token: str, enterprise: str) -> Client:
    return Client(
        base_url=f"https://api.github.com/enterprises/{enterprise}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        },
    )


@action(
    display_name="Search Enterprise Audit Logs",
    display_namespace="GitHub",
    description="Search GitHub audit logs for an enterprise.",
    secrets_placeholders=["GITHUB_ENTERPRISE_SECRET"],
)
def search_github_enterprise_audit_logs(
    enterprise: Annotated[
        str,
        ArgumentMetadata(
            display_name="Enterprise",
            description="The slug version of the enterprise name. You can also substitute this value with the enterprise id.",
        ),
    ],
    filter: Annotated[
        str,
        ArgumentMetadata(
            display_name="Filter",
            description="Filter to apply to the query.",
        ),
    ] = None,
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
        int | None,
        ArgumentMetadata(
            display_name="Limit",
            description="Maximum number of logs to return.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://docs.github.com/en/enterprise-cloud@latest/rest/enterprise-admin/audit-log?apiVersion=2022-11-28#get-the-audit-log-for-an-enterprise
    # https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates

    secret = ctx.get().secrets.get("GITHUB_ENTERPRISE_SECRET")
    access_token = secret["access_token"]

    with get_github_enterprise_client(access_token, enterprise) as client:
        params = {"order": "asc", "per_page": 100}

        phrases = []

        if filter:
            phrases.append(filter)

        if start_time and end_time:
            phrases.append(f"created:{start_time}..{end_time}")
        elif start_time:
            phrases.append(f"created:>={start_time}")
        elif end_time:
            phrases.append(f"created:<={end_time}")

        if is_not_empty(phrases):
            params["phrase"] = " ".join(phrases)

        url = "/audit-log"
        events = []
        while limit is None or len(events) < limit:
            response = client.get(
                url,
                params=params,
            )
            response.raise_for_status()
            events.extend(response.json())

            if "next" in response.links:
                url = response.links["next"]["url"][len(str(client.base_url)) :]
                params = None
            else:
                break

        return events if limit is None else events[:limit]
