"""

admyral workflow push kandji_alert_for_unencrypted_devices -f workflows/kandji_unencrypted_devices.py --activate

"""

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue

from admyral.actions import (
    list_kandji_devices,
    format_json_to_list_view_string,
    send_slack_message,
    select_fields_from_objects_in_list,
)


@workflow(
    description="Alert for unencrypted managed devices in Kandji via Slack",
    triggers=[Schedule(interval_days=7)],
)
def kandji_alert_for_unencrypted_devices(payload: dict[str, JsonValue]):
    unencrypted_devices = list_kandji_devices(
        last_checkin_within_days=90,
        blueprints=[
            "Default Blueprint"
        ],  # TODO: set your blueprints here if you want to filter by blueprints
        platform="Mac",
        filevault_enabled=False,
        secrets={"KANDJI_SECRET": "kandji_secret"},
    )

    if unencrypted_devices:
        selected_fields = select_fields_from_objects_in_list(
            input_list=unencrypted_devices,
            fields=["device_name", "device_id"],
        )

        formatted_string = format_json_to_list_view_string(
            json_value=selected_fields,
        )

        send_slack_message(
            channel_id="C06QP0KV1L2",  # TODO: set your channel id here
            text=f"🚨 Unencrypted devices detected 🚨\n\n{formatted_string}",
            secrets={"SLACK_SECRET": "slack_secret"},
        )
