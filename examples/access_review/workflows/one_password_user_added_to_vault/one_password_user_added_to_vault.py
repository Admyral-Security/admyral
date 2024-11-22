"""

admyral action push get_time_range_of_last_full_hour -a workflows/one_password_user_added_to_vault/one_password_user_added_to_vault.py
admyral action push filter_by_vault_and_build_slack_message -a workflows/one_password_user_added_to_vault/one_password_user_added_to_vault.py

admyral workflow push workflows/one_password_user_added_to_vault/one_password_user_added_to_vault.yaml --activate

"""

from typing import Annotated
from datetime import datetime, timedelta, UTC

from admyral.typings import JsonValue
from admyral.action import ArgumentMetadata, action


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
