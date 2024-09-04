from typing import Annotated
import json
from datetime import datetime, timedelta

from admyral.workflow import workflow, Schedule
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata
from admyral.actions import (
    batched_send_slack_message_to_user_by_email,
    okta_search_users,
)


@action(
    display_name="Filter Inactive Okta Users",
    display_namespace="Okta",
    description="Filter Okta users who haven't logged in for a specified number of days",
)
def filter_inactive_okta_users(
    users: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Okta Users",
            description="List of Okta users to filter",
        ),
    ],
    inactivity_threshold: Annotated[
        int,
        ArgumentMetadata(
            display_name="Inactivity Threshold",
            description="Number of days of inactivity to filter by",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    inactive_users = []
    threshold_date = datetime.now() - timedelta(days=inactivity_threshold)

    for user in users:
        last_login = user.get("lastLogin")
        if last_login:
            last_login_date = datetime.fromisoformat(last_login.rstrip("Z"))
            if last_login_date < threshold_date:
                inactive_users.append(user)
        else:
            # If lastLogin is None, the user has never logged in
            inactive_users.append(user)

    return inactive_users


@action(
    display_name="Build Okta Inactivity Messages",
    display_namespace="Okta",
    description="Build Slack messages for inactive Okta users",
)
def build_okta_inactivity_messages(
    inactive_users: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Inactive Users",
            description="List of inactive Okta users",
        ),
    ],
) -> list[tuple[str, str | None, JsonValue]]:
    messages = []
    for user in inactive_users:
        email = user["profile"]["email"]
        first_name = user["profile"]["firstName"]
        messages.append(
            (
                email,
                None,
                [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"Hello {first_name}, you haven't logged into Okta for over 90 days. "
                            "Please confirm if you still need access.",
                        },
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "action_id": "okta_use_it_or_lose_it-yes",
                                "value": json.dumps(
                                    {
                                        "user": email,
                                        "workflow": "okta_use_it_or_lose_it",
                                        "response": "yes",
                                    }
                                ),
                                "text": {
                                    "type": "plain_text",
                                    "text": "Yes, I need access",
                                },
                            },
                            {
                                "type": "button",
                                "action_id": "okta_use_it_or_lose_it-no",
                                "value": json.dumps(
                                    {
                                        "user": email,
                                        "workflow": "okta_use_it_or_lose_it",
                                        "response": "no",
                                    }
                                ),
                                "text": {
                                    "type": "plain_text",
                                    "text": "No, I no longer need access",
                                },
                            },
                        ],
                    },
                ],
            )
        )
    return [message for message in messages if not message[0].endswith("@admyral.dev")]


@workflow(
    description="Check Okta user inactivity and ask if access is still required",
    triggers=[Schedule(interval_days=1)],
)
def okta_use_it_or_lose_it(payload: dict[str, JsonValue]):
    # Search for all Okta users
    all_users = okta_search_users(
        search=None,  # No filter, get all users
        limit=1000,  # Adjust as needed
        secrets={"OKTA_SECRET": "okta_secret"},
    )

    # Filter inactive users (90 days threshold)
    inactive_users = filter_inactive_okta_users(
        users=all_users,
        inactivity_threshold=90,
    )

    # Build messages for inactive users
    messages = build_okta_inactivity_messages(
        inactive_users=inactive_users,
    )

    # Send Slack messages to inactive users
    batched_send_slack_message_to_user_by_email(
        messages=messages,
        secrets={"SLACK_SECRET": "slack_secret"},
    )
