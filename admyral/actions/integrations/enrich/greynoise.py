from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_grey_noise_client(api_key: str) -> Client:
    return Client(
        base_url="https://api.greynoise.io/v3",
        headers={
            "x-apikey": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Analyze IP Address",
    display_namespace="GreyNoise",
    description="Analyze an IP address using GreyNoise",
    secrets_placeholders=["GREY_NOISE_SECRET"],
)
def grey_noise_ip_lookup(
    ip_address: Annotated[
        str,
        ArgumentMetadata(
            display_name="IP Address", description="The IP address to analyze"
        ),
    ],
) -> JsonValue:
    # https://docs.greynoise.io/reference/get_v3-community-ip
    secret = ctx.get().secrets.get("GREY_NOISE_SECRET")
    api_key = secret["api_key"]
    with get_grey_noise_client(api_key) as client:
        response = client.get(f"/community/{ip_address}")
        response.raise_for_status()
        return response.json()
