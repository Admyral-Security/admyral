from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_1password_client(domain: str, api_key: str) -> Client:
    return Client(
        base_url=f"https://{domain}",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="List Audit Events",
    display_namespace="1Password",
    description="List audit events from 1Password",
    secrets_placeholders=["1PASSWORD_SECRET"],
)
def list_1password_audit_events(
    action_type_filter: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Action Type Filter",
            description="The action type to filter events by.",
        ),
    ] = None,
    object_type_filter: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Object Type Filter",
            description="The object type to filter events by.",
        ),
    ] = None,
    start_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Start Time",
            description="The date and time to start retrieving events in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). "
            "If not specified, start_time will default to one hour before specified end_time. If no end_time is "
            "specified, start_time will default to one hour ago.",
        ),
    ] = None,
    end_time: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Time",
            description="The date and time to stop retrieving events in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).",
        ),
    ] = None,
    limit: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Limit",
            description="The maximum number of events to retrieve.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://developer.1password.com/docs/events-api/reference#post-apiv1auditevents

    secret = ctx.get().secrets.get("1PASSWORD_SECRET")
    api_key = secret["api_key"]
    domain = secret["domain"]

    with get_1password_client(domain, api_key) as client:
        events = []

        body = {
            "limit": 1000,
        }
        if start_time:
            body["start_time"] = (
                f"{start_time[:-1]}+00:00" if start_time.endswith("Z") else start_time
            )
        if end_time:
            body["end_time"] = (
                f"{end_time[:-1]}+00:00" if end_time.endswith("Z") else end_time
            )

        while limit is None or len(events) < limit:
            client_response = client.post("/api/v1/auditevents", json=body)
            client_response.raise_for_status()

            data = client_response.json()

            if action_type_filter and object_type_filter:
                items = [
                    event
                    for event in data["items"]
                    if event["action"] == action_type_filter
                    and event["object_type"] == object_type_filter
                ]
            elif action_type_filter:
                items = [
                    event
                    for event in data["items"]
                    if event["action"] == action_type_filter
                ]
            elif object_type_filter:
                items = [
                    event
                    for event in data["items"]
                    if event["object_type"] == object_type_filter
                ]
            else:
                items = data["items"]

            events.extend(items)

            if data["has_more"]:
                body = {"cursor": data["cursor"]}
            else:
                break

        return events if limit is None else events[:limit]
