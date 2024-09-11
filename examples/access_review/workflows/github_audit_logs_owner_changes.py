from typing import Annotated
from datetime import datetime, timedelta, UTC

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    search_github_enterprise_audit_logs,
    batched_send_slack_message_to_user_by_email,
)


@action(
    display_name="Calculate Time Range for Last Full Hour",
    display_namespace="Utilities",
    description="Calculate the time range for the last full hour",
)
def get_time_range_of_last_full_hour() -> tuple[str, str]:
    end_time = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start_time = (end_time - timedelta(hours=1)).isoformat() + "Z"
    return (start_time, end_time.isoformat() + "Z")


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


@workflow(
    description="Alert on GitHub Orga Owner Changes",
    triggers=[Schedule(cron="0 * * * *")],
)
def github_audit_logs_owner_changes(payload: dict[str, JsonValue]):
    start_and_end_time = get_time_range_of_last_full_hour()

    logs = search_github_enterprise_audit_logs(
        enterprise="admyral",  # TODO: set your enterprise slug here
        filter="action:org.update_member",
        start_time=start_and_end_time[0],
        end_time=start_and_end_time[1],
        secrets={"GITHUB_ENTERPRISE_SECRET": "github_enterprise_secret"},
    )

    if logs:
        messages = build_info_message_owner_changes(
            logs=logs,
            email="daniel@admyral.dev",  # TODO: set your Slack email here
        )

        batched_send_slack_message_to_user_by_email(
            messages=messages,
            secrets={"SLACK_SECRET": "slack_secret"},
        )
