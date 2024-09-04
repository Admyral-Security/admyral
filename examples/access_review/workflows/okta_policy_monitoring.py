from typing import Annotated
from datetime import datetime, timedelta

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import get_okta_logs, send_slack_message_to_user_by_email


@action(
    display_name="Calculate Start Time",
    display_namespace="Utilities",
    description="Calculate start time for the last hour",
)
def calculate_start_time() -> str:
    return (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"


@action(
    display_name="Calculate End Time",
    display_namespace="Utilities",
    description="Calculate end time (current time)",
)
def calculate_end_time() -> str:
    return datetime.utcnow().isoformat() + "Z"


@action(
    display_name="Get Okta Policy Update Logs",
    display_namespace="Okta",
    description="Retrieve Okta policy update logs for a specified time range",
    secrets_placeholders=["OKTA_SECRET"],
)
def get_okta_policy_update_logs(
    start_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="Start Time",
            description="The start time for the logs to retrieve in ISO 8601 format",
        ),
    ],
    end_time: Annotated[
        str,
        ArgumentMetadata(
            display_name="End Time",
            description="The end time for the logs to retrieve in ISO 8601 format",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    return get_okta_logs(
        query="policy.lifecycle.update",
        start_time=start_time,
        end_time=end_time,
        secrets={"OKTA_SECRET": "okta_secret"},
    )


@action(
    display_name="Format Okta Policy Update Message",
    display_namespace="Okta",
    description="Format Okta policy update logs into a readable message",
)
def format_okta_policy_update_message(
    logs: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Okta Logs",
            description="List of Okta policy update logs",
        ),
    ],
) -> str:
    message = f"Attention: {len(logs)} Okta policy lifecycle update(s) detected in the last hour.\n\n"
    for log in logs:
        message += f"Event ID: {log.get('eventId')}\n"
        message += f"Timestamp: {log.get('published')}\n"
        message += f"Actor: {log.get('actor', {}).get('displayName')}\n"
        message += f"Target: {log.get('target', [{}])[0].get('displayName')}\n"
        message += "---\n"
    return message


@workflow(
    description="Monitor Okta policy lifecycle updates and notify via Slack",
    triggers=[Schedule(interval_hours=1)],
)
def okta_policy_monitoring(payload: dict[str, JsonValue]):
    start_time = calculate_start_time()
    end_time = calculate_end_time()

    logs = get_okta_policy_update_logs(start_time=start_time, end_time=end_time)

    if logs:
        message = format_okta_policy_update_message(logs=logs)

        send_slack_message_to_user_by_email(
            email="ch.grittner@gmail.com",
            text=message,
            secrets={"SLACK_SECRET": "slack_secret"},
        )
