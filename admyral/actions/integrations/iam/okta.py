"""
Setup:

1, Go to the Admin Dashboard in Okta
2. Go to Security > API > Tokens
3. Click on "Create Token"

"""

from typing import Annotated
from httpx import Client, Response

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


# TODO: OAuth2: https://developer.okta.com/docs/guides/implement-oauth-for-okta-serviceapp/main/
def get_okta_client(okta_domain: str, api_key: str) -> Client:
    return Client(
        base_url=f"https://{okta_domain}/api/v1",
        headers={
            "Authorization": f"SSWS {api_key}",
            "Accept": "application/json",
        },
    )


def _get_next_link(response: Response) -> str | None:
    next_link = [
        header.split(";")[0][1:-1]
        for header in response.headers.get_list("link")
        if header.endswith('rel="next"')
    ]
    return next_link[0] if len(next_link) > 0 else None


# TODO: OCSF schema mapping
@action(
    display_name="List Events",
    display_namespace="Okta",
    description="List events from Okta",
    secrets_placeholders=["OKTA_SECRET"],
)
def list_okta_events(
    user_id: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="User ID",
            description="The user ID to list events for.",
        ),
    ] = None,
    start_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "1970-01-01T00:00:00Z",
    end_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the cases to list. Must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = "2100-01-01T00:00:00Z",
    limit: Annotated[
        int,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of cases to list.",
        ),
    ] = 1000,
) -> list[dict[str, JsonValue]]:
    # Note: Bounded Request - Polling Request use case not supported
    # https://developer.okta.com/docs/reference/api/system-log/

    secret = ctx.get().secrets.get("OKTA_SECRET")
    okta_domain = secret["domain"]
    api_key = secret["api_key"]

    with get_okta_client(okta_domain, api_key) as client:
        params = {
            "limit": min(limit, 1000),
            "since": start_time,
            "until": end_time,
        }
        if user_id:
            params["filter"] = f'actor.id eq "{user_id}"'

        response = client.get("/logs", params=params)
        response.raise_for_status()

        events = response.json()

        # handle pagination
        prev_num_events = len(events)
        base_url = str(client.base_url)
        while link := _get_next_link(response):
            response = client.get(link.replace(base_url, ""))
            response.raise_for_status()
            events.extend(response.json())
            if len(events) >= limit or prev_num_events == len(events):
                break
            prev_num_events = len(events)

        return events[:limit]
