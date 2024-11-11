"""

admyral workflow push kandji_alert_for_unencrypted_devices -f workflows/kandji_unencrypted_devices2.py

"""

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue

from admyral.actions import (
    list_kandji_unencrypted_devices,
    select_fields_from_objects_in_list,
    format_json_to_list_view_string,
    send_slack_message_to_user_by_email,
)


@workflow(
    description="Alert for unencrypted managed devices in Kandji via Slack",
    triggers=[Schedule(interval_days=7)],
)
def kandji_alert_for_unencrypted_devices(payload: dict[str, JsonValue]):
    unencrypted_devices = list_kandji_unencrypted_devices(
        secrets={"KANDJI_SECRET": "kandji_secret"},
    )

    selected_fields = select_fields_from_objects_in_list(
        objects=unencrypted_devices,
        fields=["device_name", "device_id"],
    )

    formatted_string = format_json_to_list_view_string(
        objects=selected_fields,
    )

    send_slack_message_to_user_by_email(
        email="test@test.com",
        text=formatted_string,
        secrets={"SLACK_SECRET": "slack_secret"},
    )
