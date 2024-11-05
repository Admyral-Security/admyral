from typing import Annotated
from httpx import Client
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.exceptions import NonRetryableActionError
from admyral.secret.secret import register_secret


@register_secret(secret_type="LeakCheck")
class LeakCheckSecret(BaseModel):
    api_key: str


def _get_leakcheck_v2_client(secret: LeakCheckSecret) -> Client:
    return Client(
        base_url="https://leakcheck.io/api/v2",
        headers={
            "X-API-Key": secret.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


def _get_leakcheck_public_client() -> Client:
    return Client(
        base_url="https://leakcheck.io/api",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Lookup API v2",
    display_namespace="LeakCheck",
    description="Perform a lookup query.",
    secrets_placeholders=["LEAKCHECK_SECRET"],
)
def leakcheck_v2_lookup(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The main value to search (email, username, etc.).",
        ),
    ],
    query_type: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="Query Type",
            description="The type of query to perform (email, username, etc.).",
        ),
    ] = None,
    limit: Annotated[
        int,
        ArgumentMetadata(
            display_name="Limit",
            description="The number of results to return. Max: 1000.",
        ),
    ] = 100,
) -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("LEAKCHECK_SECRET")
    secret = LeakCheckSecret.model_validate(secret)

    if limit > 1000:
        raise ValueError("Limit cannot be greater than 1000.")

    with _get_leakcheck_v2_client(secret) as client:
        params = {"limit": limit}
        if query_type:
            params["type"] = query_type

        response = client.get(f"/query/{query}", params=params)
        response.raise_for_status()
        data = response.json()
        if not data.get("success", False):
            raise NonRetryableActionError(
                f"API responded with an error: {data.get("error", "Unknown error")}"
            )
        return data["data"]


@action(
    display_name="Lookup public API",
    display_namespace="LeakCheck",
    description="Perform a lookup query.",
)
def leakcheck_public_lookup(
    query: Annotated[
        str,
        ArgumentMetadata(
            display_name="Query",
            description="The main value to search (email, username, etc.).",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    with _get_leakcheck_public_client() as client:
        response = client.get(
            f"/public?check={query}",
        )
        response.raise_for_status()
        return response.json()
