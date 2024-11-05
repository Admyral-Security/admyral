from typing import Annotated
from httpx import Client
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.secret.secret import register_secret


@register_secret(secret_type="Kandji")
class KandjiSecret(BaseModel):
    api_url: str
    api_token: str


def get_kandji_client(secret: KandjiSecret) -> Client:
    return Client(
        base_url=f"https://{secret.api_url}/api/v1",
        headers={
            "Authorization": f"Bearer {secret.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


def _kandji_get_api_with_pagination(url: str, data_access_key: str | None = None):
    secret = ctx.get().secrets.get("KANDJI_SECRET")
    secret = KandjiSecret.model_validate(secret)

    with get_kandji_client(secret) as client:
        offset = 0
        max_limit_per_page = 300

        out = []

        while True:
            response = client.get(
                url=url,
                params={"limit": max_limit_per_page, "offset": offset},
            )
            response.raise_for_status()

            result = response.json()
            if data_access_key is None:
                new_data = result
            else:
                new_data = result[data_access_key]
            out.extend(new_data)

            offset += len(new_data)
            if len(new_data) < max_limit_per_page:
                break

        return out


def _kandji_get_api(url: str) -> dict[str, JsonValue]:
    secret = ctx.get().secrets.get("KANDJI_SECRET")
    secret = KandjiSecret.model_validate(secret)

    with get_kandji_client(secret) as client:
        response = client.get(url=url)
        response.raise_for_status()
        return response.json()


@action(
    display_name="List Devices",
    display_namespace="Kandji",
    description="List devices managed by Kandji",
    secrets_placeholders=["KANDJI_SECRET"],
)
def list_kandji_devices() -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#78209960-31a7-4e3b-a2c0-95c7e65bb5f9
    return _kandji_get_api_with_pagination(url="/devices")


@action(
    display_name="Get Device Details",
    display_namespace="Kandji",
    description="List devices managed by Kandji",
    secrets_placeholders=["KANDJI_SECRET"],
)
def get_kandji_device_details(
    device_id: Annotated[
        str,
        ArgumentMetadata(display_name="Device ID", description="The ID of the device"),
    ],
) -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#efa2170d-e5f7-4b97-8f4c-da6f84ba58b5
    return _kandji_get_api(url=f"/devices/{device_id}/details")


@action(
    display_name="List Unencrypted Devices",
    display_namespace="Kandji",
    description="List devices managed by Kandji which don't have disk encryption enabled on all volumes",
    secrets_placeholders=["KANDJI_SECRET"],
)
def list_kandji_unencrypted_devices() -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#78209960-31a7-4e3b-a2c0-95c7e65bb5f9

    devices = _kandji_get_api_with_pagination(url="/devices")

    unencrypted_devices = []
    for device in devices:
        device_details = _kandji_get_api(url=f"/devices/{device["device_id"]}/details")
        if any(volume["encrypted"] == "No" for volume in device_details["volumes"]):
            unencrypted_devices.append(device)

    return unencrypted_devices


@action(
    display_name="Get Device Apps",
    display_namespace="Kandji",
    description="List the installed apps of a Kandji managed device",
    secrets_placeholders=["KANDJI_SECRET"],
)
def get_kandji_device_apps(
    device_id: Annotated[
        str,
        ArgumentMetadata(display_name="Device ID", description="The ID of the device"),
    ],
) -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#f8cd9733-89b6-40f0-a7ca-76829c6974df
    return _kandji_get_api_with_pagination(
        url=f"/devices/{device_id}/apps", data_access_key="apps"
    )


@action(
    display_name="Application Firewall",
    display_namespace="Kandji",
    description="Get Application Firewall details for macOS.",
    secrets_placeholders=["KANDJI_SECRET"],
)
def get_kandji_application_firewall() -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#0d3abc6c-a5a5-4fe6-b7d4-19b1287eaf91

    return _kandji_get_api_with_pagination(
        url="/prism/application_firewall", data_access_key="data"
    )


@action(
    display_name="Desktop and Screensaver",
    display_namespace="Kandji",
    description="Get Desktop and Screensaver details for macOS.",
    secrets_placeholders=["KANDJI_SECRET"],
)
def get_kandji_desktop_and_screensaver() -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#7f6f6813-6522-4249-9f6a-3d0c479e2bbe
    return _kandji_get_api_with_pagination(
        url="/prism/desktop_and_screensaver", data_access_key="data"
    )


@action(
    display_name="Get Library Item Statuses",
    display_namespace="Kandji",
    description="This endpoint retrieves the statuses related to a specific library item.",
    secrets_placeholders=["KANDJI_SECRET"],
)
def get_kandji_library_item_statuses(
    library_item_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Library Item ID", description="The ID of the library item"
        ),
    ],
) -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#478764c4-638c-416c-b44c-3685a2f7b441
    return _kandji_get_api_with_pagination(
        url=f"/library/library-items/{library_item_id}/status",
        data_access_key="results",
    )
