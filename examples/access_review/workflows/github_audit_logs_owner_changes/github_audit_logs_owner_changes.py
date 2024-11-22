"""

admyral action push get_time_range_of_last_full_hour -a workflows/github_audit_logs_owner_changes/github_audit_logs_owner_changes.py
admyral action push build_info_message_owner_changes -a workflows/github_audit_logs_owner_changes/github_audit_logs_owner_changes.py

admyral workflow push workflows/github_audit_logs_owner_changes/github_audit_logs_owner_changes.yaml

"""

from typing import Annotated
from datetime import datetime, timedelta, UTC

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata


@action(
    display_name="Calculate Time Range for Last Full Hour",
    display_namespace="Utilities",
    description="Calculate the time range for the last full hour",
)
def get_time_range_of_last_full_hour() -> tuple[str, str]:
    end_time = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start_time = (end_time - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    return (start_time, end_time.isoformat().replace("+00:00", "Z"))


@action(
    display_name="Build Info message",
    display_namespace="GitHub",
    description="Builds a message for the slack notification",
)
def build_info_message_owner_changes(
    logs: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Logs",
            description="The logs to build the message from",
        ),
    ],
    email: Annotated[
        str,
        ArgumentMetadata(
            display_name="Email",
            description="The email to send the message to",
        ),
    ],
) -> list[tuple[str, str | None, JsonValue]]:
    messages = []
    for log in logs:
        timestamp = datetime.fromtimestamp(int(log["created_at"]) / 1000).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        if log["action"] == "org.update_member":
            messages.append(
                (
                    email,
                    f"Owner change detected in enterprise {log['business']} at {timestamp} by {log['actor']}:\nChanged Permission for {log['user']}: {log['old_permission']} -> {log['permission']}\n",
                    None,
                )
            )
    return messages
