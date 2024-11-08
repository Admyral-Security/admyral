"""

admyral action push transform_kandji_devices_information -a workflows/kandji_device_information.py
admyral workflow push kandji_device_information -f workflows/kandji_device_information.py --activate

Required Kandji Permissions:
- Application Firewall
- Desktop & Screensaver
- View Library Item Status
- Device list

"""

from typing import Annotated

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.actions import (
    list_kandji_devices,
    get_kandji_application_firewall,
    get_kandji_desktop_and_screensaver,
    join_lists,
    format_json_to_list_view_string,
    send_slack_message,
    select_fields_from_objects_in_list,
)
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


@workflow(
    description="Alert for unencrypted managed devices in Kandji via Slack",
    triggers=[Schedule(interval_days=1)],
)
def kandji_device_information(payload: dict[str, JsonValue]):
    # get OS version
    devices = list_kandji_devices(secrets={"KANDJI_SECRET": "kandji_secret"})
    devices = select_fields_from_objects_in_list(
        input_list=devices,
        fields=["device_id", "device_name", "platform", "os_version"],
    )

    device_status_application_firewall = get_kandji_application_firewall(
        secrets={"KANDJI_SECRET": "kandji_secret"},
    )
    device_status_application_firewall = select_fields_from_objects_in_list(
        input_list=device_status_application_firewall,
        fields=["device_id", "status"],
    )
    result = join_lists(
        list1=devices,
        list1_join_key_paths=[["device_id"]],
        list2=device_status_application_firewall,
        list2_join_key_paths=[["device_id"]],
        key_prefix_list2="application_firewall_",
    )

    device_status_desktop_and_screensaver = get_kandji_desktop_and_screensaver(
        secrets={"KANDJI_SECRET": "kandji_secret"}
    )
    device_status_desktop_and_screensaver = select_fields_from_objects_in_list(
        input_list=device_status_desktop_and_screensaver,
        fields=["device_id", "screensaver_interval"],
    )
    result = join_lists(
        list1=result,
        list1_join_key_paths=[["device_id"]],
        list2=device_status_desktop_and_screensaver,
        list2_join_key_paths=[["device_id"]],
        key_prefix_list2="desktop_and_screensaver_",
    )

    formatted_devices = transform_kandji_devices_information(devices=result)
    message = format_json_to_list_view_string(json_value=formatted_devices)
    send_slack_message(
        channel_id="C06QP0KV1L2",  # TODO: set your channel id here
        text=f"Kandji Devices Information:\n{message}",
        secrets={"SLACK_SECRET": "slack_secret"},
    )
