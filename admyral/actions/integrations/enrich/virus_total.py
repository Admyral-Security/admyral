from typing import Annotated
from httpx import Client
import base64

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_virus_total_client(api_key: str) -> Client:
    return Client(
        base_url="https://www.virustotal.com/api/v3",
        headers={
            "x-apikey": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="Analyze File Hash",
    display_namespace="VirusTotal",
    description="Analyze a hash using VirusTotal",
    secrets_placeholders=["VIRUS_TOTAL_SECRET"],
)
def virus_total_analyze_hash(
    hash: Annotated[
        str,
        ArgumentMetadata(
            display_name="Hash",
            description="The file hash to analyze",
        ),
    ],
) -> JsonValue:
    # https://docs.virustotal.com/reference/file-info
    secret = ctx.get().secrets.get("VIRUS_TOTAL_SECRET")
    api_key = secret["api_key"]
    with get_virus_total_client(api_key) as client:
        response = client.get(f"/files/{hash}")
        response.raise_for_status()
        return response.json()


@action(
    display_name="Analyze Domain",
    display_namespace="VirusTotal",
    description="Analyze a domain using VirusTotal",
    secrets_placeholders=["VIRUS_TOTAL_SECRET"],
)
def virus_total_analyze_domain(
    domain: Annotated[
        str,
        ArgumentMetadata(
            display_name="Domain",
            description="The domain to analyze",
        ),
    ],
) -> JsonValue:
    # https://docs.virustotal.com/reference/domain-info
    secret = ctx.get().secrets.get("VIRUS_TOTAL_SECRET")
    api_key = secret["api_key"]
    with get_virus_total_client(api_key) as client:
        response = client.get(f"/domains/{domain}")
        response.raise_for_status()
        return response.json()


@action(
    display_name="Analyze IP Address",
    display_namespace="VirusTotal",
    description="Analyze an IP address using VirusTotal",
    secrets_placeholders=["VIRUS_TOTAL_SECRET"],
)
def virus_total_analyze_ip(
    ip_address: Annotated[
        str,
        ArgumentMetadata(
            display_name="IP Address", description="The IP address to analyze"
        ),
    ],
) -> JsonValue:
    # https://developers.virustotal.com/reference/ip-addresses
    secret = ctx.get().secrets.get("VIRUS_TOTAL_SECRET")
    api_key = secret["api_key"]
    with get_virus_total_client(api_key) as client:
        response = client.get(f"/ip_addresses/{ip_address}")
        response.raise_for_status()
        return response.json()


@action(
    display_name="Analyze URL",
    display_namespace="VirusTotal",
    description="Analyze a URL using VirusTotal",
    secrets_placeholders=["VIRUS_TOTAL_SECRET"],
)
def virus_total_analyze_url(
    url: Annotated[
        str,
        ArgumentMetadata(
            display_name="URL",
            description="The URL to analyze",
        ),
    ],
) -> JsonValue:
    # https://docs.virustotal.com/reference/url-info
    secret = ctx.get().secrets.get("VIRUS_TOTAL_SECRET")
    api_key = secret["api_key"]
    with get_virus_total_client(api_key) as client:
        url_base64 = base64.b64encode(url.encode()).decode()
        url_base64 = url_base64.rstrip("=")
        response = client.get(f"/urls/{url_base64}")
        response.raise_for_status()
        return response.json()
