from typing import Annotated
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue


def get_kandji_client(api_url: str, api_token: str) -> Client:
    return Client(
        base_url=f"https://{api_url}/api/v1",
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


def _list_devices(client: Client) -> list[dict[str, JsonValue]]:
    offset = 0
    limit_per_page = 300

    devices = []

    while True:
        response = client.get(
            "/devices", params={"offset": offset, "limit": limit_per_page}
        )
        response.raise_for_status()

        new_devices = response.json()
        devices.extend(new_devices)

        offset += len(new_devices)
        if len(new_devices) < limit_per_page:
            break

    return devices


def _get_device_details(client: Client, device_id: str) -> dict[str, JsonValue]:
    response = client.get(f"/devices/{device_id}/details")
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

    secret = ctx.get().secrets.get("KANDJI_SECRET")
    api_token = secret["api_token"]
    api_url = secret["api_url"]

    with get_kandji_client(api_url, api_token) as client:
        return _list_devices(client)


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

    secret = ctx.get().secrets.get("KANDJI_SECRET")
    api_token = secret["api_token"]
    api_url = secret["api_url"]

    with get_kandji_client(api_url, api_token) as client:
        return _get_device_details(client, device_id)


@action(
    display_name="List Unencrypted Devices",
    display_namespace="Kandji",
    description="List devices managed by Kandji which don't have disk encryption enabled on all volumes",
    secrets_placeholders=["KANDJI_SECRET"],
)
def list_kandji_unencrypted_devices() -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#78209960-31a7-4e3b-a2c0-95c7e65bb5f9

    secret = ctx.get().secrets.get("KANDJI_SECRET")
    api_token = secret["api_token"]
    api_url = secret["api_url"]

    with get_kandji_client(api_url, api_token) as client:
        devices = _list_devices(client)

        unencrypted_devices = []
        for device in devices:
            device_details = _get_device_details(client, device["device_id"])
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

    secret = ctx.get().secrets.get("KANDJI_SECRET")
    api_token = secret["api_token"]
    api_url = secret["api_url"]

    with get_kandji_client(api_url, api_token) as client:
        offset = 0
        max_limit_per_page = 300

        apps = []

        while True:
            response = client.get(
                url=f"/devices/{device_id}/apps",
                params={"limit": max_limit_per_page, "offset": offset},
            )
            response.raise_for_status()

            new_apps = response.json()["apps"]
            apps.extend(new_apps)

            offset += len(new_apps)
            if len(new_apps) < max_limit_per_page:
                break

        return apps
