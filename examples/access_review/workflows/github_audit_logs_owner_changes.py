from typing import Annotated
from datetime import datetime

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    search_github_audit_logs,
    batched_send_slack_message_to_user_by_email,
)


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
    triggers=[
        Schedule(cron="0 * * * *", enterprise="admyral", email="daniel@admyral.dev")
    ],
)
def github_audit_logs_owner_changes(payload: dict[str, JsonValue]):
    logs = search_github_audit_logs(
        enterprise=payload["enterprise"],
        filter=payload["filter"],
        start_time=payload["start_time"],
        end_time=payload["end_time"],
        secrets={"GITHUB_ENTERPRISE_SECRET": "github_enterprise_secret"},
    )

    if logs:
        messages = build_info_message_owner_changes(logs=logs, email=payload["email"])

        batched_send_slack_message_to_user_by_email(
            messages=messages,
            secrets={"SLACK_SECRET": "slack_secret"},
        )
