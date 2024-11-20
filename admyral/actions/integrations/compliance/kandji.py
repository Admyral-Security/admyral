from typing import Annotated, Literal
from httpx import Client
from pydantic import BaseModel
from dateutil.parser import parse
from datetime import timedelta

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.secret.secret import register_secret
from admyral.utils.time import utc_now


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


def _kandji_get_api_with_pagination(
    url: str,
    params: dict[str, JsonValue] | None = None,
    data_access_key: str | None = None,
):
    secret = ctx.get().secrets.get("KANDJI_SECRET")
    secret = KandjiSecret.model_validate(secret)

    with get_kandji_client(secret) as client:
        max_limit_per_page = 300

        params = params or {}
        params["limit"] = max_limit_per_page
        params["offset"] = 0

        out = []

        while True:
            response = client.get(url=url, params=params)
            response.raise_for_status()

            result = response.json()
            if data_access_key is None:
                new_data = result
            else:
                new_data = result[data_access_key]
            out.extend(new_data)

            params["offset"] += len(new_data)
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
def list_kandji_devices(
    last_checkin_within_days: Annotated[
        int | None,
        ArgumentMetadata(
            display_name="Last Checkin Within Days",
            description="Only keep devices that have checked in within the last defined days.",
        ),
    ] = None,
    platform: Annotated[
        Literal["Mac", "iPad", "iPhone", "AppleTV"] | None,
        ArgumentMetadata(
            display_name="Platform",
            description="Only keep devices that match the defined platform. Possible values: Mac, iPad, iPhone, AppleTV",
        ),
    ] = None,
    blueprints: Annotated[
        list[str] | None,
        ArgumentMetadata(
            display_name="Blueprints",
            description="Only keep devices that match the defined blueprints.",
        ),
    ] = None,
    filevault_enabled: Annotated[
        bool | None,
        ArgumentMetadata(
            display_name="FileVault Enabled",
            description="Only keep devices that have FileVault enabled. Only for Mac devices.",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    # https://api-docs.kandji.io/#78209960-31a7-4e3b-a2c0-95c7e65bb5f9
    params = {}
    if platform is not None:
        if platform not in ["Mac", "iPad", "iPhone", "AppleTV"]:
            raise ValueError(f"Invalid platform: {platform}")
        params["platform"] = platform

    if filevault_enabled is not None:
        params["filevault_enabled"] = filevault_enabled

    devices = _kandji_get_api_with_pagination(url="/devices", params=params)

    # filter based on last checkin and blueprints
    if last_checkin_within_days is not None or blueprints is not None:
        filtered_devices = []

        if last_checkin_within_days is not None:
            last_checkin_within_days = utc_now() - timedelta(
                days=last_checkin_within_days
            )

        for device in devices:
            if blueprints is not None and device["blueprint_name"] not in blueprints:
                continue

            if last_checkin_within_days is not None:
                device_details = _kandji_get_api(
                    url=f"/devices/{device["device_id"]}/details"
                )
                if (
                    parse(device_details["mdm"]["last_check_in"])
                    < last_checkin_within_days
                ):
                    continue

            filtered_devices.append(device)

        devices = filtered_devices

    return devices


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
