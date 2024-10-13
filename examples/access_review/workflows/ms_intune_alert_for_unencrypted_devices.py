from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue

from admyral.actions import (
    list_ms_intune_unencrypted_managed_devices,
    format_json_to_list_view_string,
    send_slack_message,
)


@workflow(
    description="Alert for unencrypted managed devices in Microsoft Intune via Slack",
    triggers=[Schedule(interval_days=7)],
)
def ms_intune_alert_for_unencrypted_devices(payload: dict[str, JsonValue]):
    unencrypted_devices = list_ms_intune_unencrypted_managed_devices(
        secrets={"AZURE_SECRET": "azure_secret"},
    )

    if unencrypted_devices:
        formatted_unencrytped_devices = format_json_to_list_view_string(
            json_value=unencrypted_devices
        )
        send_slack_message(
            channel_id="C06QP0KV1L2",  # TODO: set your slack channel here
            text=f"Unencrypted devices identified:\n\n{formatted_unencrytped_devices}",
            secrets={"SLACK_SECRET": "slack_secret"},
        )
