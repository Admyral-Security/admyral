from typing import Annotated
from httpx import Client
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.secret.secret import register_secret


@register_secret(secret_type="AlienVault OTX")
class AlienVaultOTXSecret(BaseModel):
    api_key: str


def get_alienvault_otx_client(secret: AlienVaultOTXSecret) -> Client:
    return Client(
        base_url="https://otx.alienvault.com/api/v1",
        headers={
            "X-OTX-API-KEY": secret.api_key,
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
    secret = AlienVaultOTXSecret.model_validate(secret)

    with get_alienvault_otx_client(secret) as client:
        response = client.get(f"/indicators/domain/{domain}/general")
        response.raise_for_status()
        return response.json()
