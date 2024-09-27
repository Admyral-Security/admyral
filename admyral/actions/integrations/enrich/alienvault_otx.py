from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_alienvault_otx_client(api_key: str) -> Client:
    return Client(
        base_url="https://otx.alienvault.com/api/v1",
        headers={
            "X-OTX-API-KEY": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Analyze Domain",
    display_namespace="AlienVault OTX",
    description="Analyze a domain using AlienVault OTX",
    secrets_placeholders=["ALIENVAULT_OTX_SECRET"],
)
def alienvault_otx_analyze_domain(
    domain: Annotated[
        str,
        ArgumentMetadata(
            display_name="Domain",
            description="The domain to analyze",
        ),
    ],
) -> JsonValue:
    # https://otx.alienvault.com/assets/static/external_api.html
    secret = ctx.get().secrets.get("ALIENVAULT_OTX_SECRET")
    api_key = secret["api_key"]

    with get_alienvault_otx_client(api_key) as client:
        response = client.get(
            f"/indicators/domain/{domain}/general",
            headers={
                "X-OTX-API-KEY": api_key,
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        return response.json()
