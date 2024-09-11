from typing import Annotated
from datetime import datetime, timedelta, UTC


from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.actions import (
    list_1password_audit_events,
    batched_send_slack_message_to_user_by_email,
)
from admyral.action import ArgumentMetadata, action


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
    display_name="Filter by 1Password Vault and Build Slack Message",
    display_namespace="1Password",
    description="Filter audit events by vault and build a Slack message.",
)
def filter_by_vault_and_build_slack_message(
    user_email: Annotated[
        str,
        ArgumentMetadata(
            display_name="User Email",
            description="The email of the user who should receive the Slack messages.",
        ),
    ],
    vault_id: Annotated[
        str,
        ArgumentMetadata(
            display_name="Vault ID",
            description="The vault ID to filter audit events by. The vault ID can be found "
            "in the 1Password web app in the URL of the vault.",
        ),
    ],
    audit_events: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Audit Events",
            description="The list of audit events to filter.",
        ),
    ],
) -> list[JsonValue]:
    messages = []
    for audit_event in audit_events:
        if audit_event["object_uuid"] == vault_id:
            messages.append(
                (
                    user_email,
                    f"User {audit_event['actor_details']['name']} ({audit_event['actor_details']['email']}) "
                    f"added user {audit_event['aux_details']['name']} ({audit_event["aux_details"]["email"]}) "
                    f"to vault {vault_id}.",
                    None,
                )
            )
    return messages


@workflow(
    description="Retrieves all user types from Okta and lists the corresponding admin users.",
    triggers=[Schedule(cron="0 * * * *")],
)
def one_password_user_added_to_vault(payload: dict[str, JsonValue]):
    start_and_end_time = get_time_range_of_last_full_hour()

    events = list_1password_audit_events(
        action_type_filter="grant",
        object_type_filter="uva",
        start_time=start_and_end_time[0],
        end_time=start_and_end_time[1],
        secrets={"1PASSWORD_SECRET": "1password_secret"},
    )

    messages = filter_by_vault_and_build_slack_message(
        user_email="daniel@admyral.dev",  # TODO: set your email here
        vault_id="ut22fmh7v55235s6t5gjd3t4cy",  # TODO: set your vault ID here
        audit_events=events,
    )

    batched_send_slack_message_to_user_by_email(
        messages=messages, secrets={"SLACK_SECRET": "slack_secret"}
    )
