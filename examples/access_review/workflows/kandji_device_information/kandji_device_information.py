"""

admyral action push transform_kandji_devices_information -a workflows/kandji_device_information.py
admyral workflow push workflows/kandji_device_information.py --activate

Required Kandji Permissions:
- Application Firewall
- Desktop & Screensaver
- View Library Item Status
- Device list

"""

from typing import Annotated

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata


@action(
    display_name="Transform Kandji Devices Information",
    display_namespace="Kandji",
    description="Transforms Kandji devices information.",
)
def transform_kandji_devices_information(
    devices: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Devices",
            description="Kandji devices information.",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    formatted = []
    for device in devices:
        formatted_device = {
            "Device ID": device["device_id"],
            "Device Name": device["device_name"],
            "Platform": device["platform"],
            "OS Version": device["os_version"],
            "Application Firewall Activated": device["application_firewall_status"],
            "Lock Screensaver Interval": device[
                "desktop_and_screensaver_screensaver_interval"
            ],
        }
        formatted.append(formatted_device)
    return formatted
