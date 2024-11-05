from typing import Annotated
from httpx import Client
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.secret.secret import register_secret


@register_secret(secret_type="SentinelOne")
class SentinelOneSecret(BaseModel):
    base_url: str
    api_key: str


def get_sentinel_one_client(secret: SentinelOneSecret) -> Client:
    return Client(
        base_url=f"{secret.base_url}/web/api/v2.1",
        headers={
            "Authorization": f"ApiToken {secret.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )


@action(
    display_name="List Alerts",
    display_namespace="SentinelOne",
    description="List alerts from SentinelOne",
    secrets_placeholders=["SENTINEL_ONE_SECRET"],
)
def list_sentinel_one_alerts(
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
    # https://github.com/fragtastic/sentinelone-api-python/blob/67f8005576a6613f925edca93e22c8da7d6c3010/sentineloneapi/client.py#L98

    secret = ctx.get().secrets.get("SENTINEL_ONE_SECRET")
    secret = SentinelOneSecret.model_validate(secret)

    params = {
        "createdAt__gte": start_time,
        "createdAt__lte": end_time,
    }

    with get_sentinel_one_client(secret) as client:
        alerts = []

        while len(alerts) < limit:
            response = client.get("/cloud-detection/alerts", params=params)
            response.raise_for_status()
            result = response.json()

            alerts.extend(result.get("data", []))
            next_cursor = result.get("pagination", {}).get("nextCursor")

            if not next_cursor:
                break

            params["cursor"] = next_cursor

        return alerts[:limit]
