"""

admyral workflow push kandji_alert_for_unencrypted_devices -f workflows/kandji_unencrypted_devices.py
admyral workflow push kandji_unencrypted_device_alert -f workflows/kandji_unencrypted_devices.py

"""

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue

from admyral.actions import (
    list_kandji_unencrypted_devices,
    send_list_elements_to_workflow,
    send_slack_message,
)


@workflow(
    description="Alert for unencrypted managed devices in Kandji via Slack",
    triggers=[Schedule(interval_days=7)],
)
def kandji_alert_for_unencrypted_devices(payload: dict[str, JsonValue]):
    unencrypted_devices = list_kandji_unencrypted_devices(
        secrets={"KANDJI_SECRET": "kandji_secret"},
    )
    send_list_elements_to_workflow(
        workflow_name="kandji_unencrypted_device_alert",
        elements=unencrypted_devices,
    )


@workflow(
    description="Alert for unencrypted managed devices in Kandji via Slack",
)
def kandji_unencrypted_device_alert(payload: dict[str, JsonValue]):
    send_slack_message(
        channel_id="C06QP0KV1L2",  # TODO: set your slack channel here
        text=f"Unencrypted device identified:\n\nDevice name: {payload["element"]["device_name"]}\nDevice ID: {payload["element"]["device_id"]}",
        secrets={"SLACK_SECRET": "slack_secret"},
    )
