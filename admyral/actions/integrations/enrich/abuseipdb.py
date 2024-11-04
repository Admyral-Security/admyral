from typing import Annotated, Literal
from httpx import Client
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.secret.secret import register_secret


@register_secret(secret_type="AbuseIPDB")
class AbuseIPDBSecret(BaseModel):
    api_key: str


def get_abuseipdb_client(secret: AbuseIPDBSecret) -> Client:
    return Client(
        base_url="https://api.abuseipdb.com/api/v2",
        headers={
            "Key": secret.api_key,
            "Accept": "application/json",
        },
    )


@action(
    display_name="Check IP Address",
    display_namespace="AbuseIPDB",
    description="Check an IP address using AbuseIPDB",
    secrets_placeholders=["ABUSEIPDB_SECRET"],
)
def abuseipdb_analyze_ip(
    ip_address: Annotated[
        str,
        ArgumentMetadata(
            display_name="IP Address",
            description="The IP address (v4 or v6) to check",
        ),
    ],
    verbose: Annotated[
        Literal["yes", "no"] | None,
        ArgumentMetadata(
            display_name="Verbose",
            description="Whether to return verbose output",
        ),
    ] = "no",
    max_age_in_days: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Max Age in Days",
            description="The maximum age of the report in days",
        ),
    ] = 30,
) -> JsonValue:
    # https://docs.abuseipdb.com/#check-endpoint

    secret = ctx.get().secrets.get("ABUSEIPDB_SECRET")
    secret = AbuseIPDBSecret.model_validate(secret)

    with get_abuseipdb_client(secret) as client:
        params = {
            "ipAddress": ip_address,
        }
        if verbose == "yes":
            params["verbose"] = verbose
        if max_age_in_days and 1 <= max_age_in_days <= 365:
            params["maxAgeInDays"] = max_age_in_days
        response = client.get("/check", params=params)
        response.raise_for_status()
        return response.json().get("data", {})
