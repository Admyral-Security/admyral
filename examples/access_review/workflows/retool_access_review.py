from typing import Annotated
import json

from admyral.workflow import workflow
from admyral.typings import JsonValue
from admyral.actions import (
    list_groups_per_user,
    batched_send_slack_message_to_user_by_email,
)
from admyral.action import action, ArgumentMetadata


"""

Pt. 1: Prompting Workflow

1. Fetch Retool users and their permissions
2. Group users by managers and the associated permissions
3. Send manager slack message and ask for review
    Dropdown:
    - Approve access
    - Appropriate in the past but not needed anymore
    - Terminated user
    - Suspicious access


Pt. 2: Feedback Workflow

4. If manager disapproves:
    4.1 Remove permissions
    4.2 Check again that permissions were removed

"""


@action(
    display_name="Group Users and Permissions by Managers",
    display_namespace="Access Review",
    description="Groups Retool users and their permissions by their manager.",
)
def build_review_requests_as_slack_message_for_managers(
    groups_per_user: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Groups",
            description="A list of Retool groups with their members.",
        ),
    ],
) -> list[tuple[str, str | None, JsonValue]]:
    # Group by Manager
    # TODO(admyral): fetch managers from Okta
    manager = "TODO(user): set some email of a Slack user which will receive the Slack message"
    user_groups_per_manager = {manager: groups_per_user}

    # Build review requests
    messages = []

    for manager, groups_per_user_for_manager in user_groups_per_manager.items():
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Hello, here is the annual Access Review for the Retool access of your team:",
                },
            }
        ]

        for user, groups_and_last_active in groups_per_user_for_manager.items():
            blocks.append({"type": "divider"})
            blocks.append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"User {user} (Last active: {groups_and_last_active['last_active']}) is assigned to the following groups:",
                    },
                },
            )

            for group in groups_and_last_active["groups"]:
                blocks.append(
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": group},
                        "accessory": {
                            "type": "static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select an option",
                                "emoji": True,
                            },
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Approved access",
                                        "emoji": True,
                                    },
                                    "value": json.dumps(
                                        {
                                            "group": group,
                                            "user": user,
                                            "response": "keep",
                                            "reason": "Approved access",
                                        }
                                    ),
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Appropriate in the past but not needed anymore",
                                        "emoji": True,
                                    },
                                    "value": json.dumps(
                                        {
                                            "group": group,
                                            "user": user,
                                            "response": "remove",
                                            "reason": "Appropriate in the past but not needed anymore",
                                        }
                                    ),
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Terminated user",
                                        "emoji": True,
                                    },
                                    "value": json.dumps(
                                        {
                                            "group": group,
                                            "user": user,
                                            "response": "remove",
                                            "reason": "Terminated user",
                                        }
                                    ),
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Suspicious access",
                                        "emoji": True,
                                    },
                                    "value": json.dumps(
                                        {
                                            "group": group,
                                            "user": user,
                                            "response": "remove",
                                            "reason": "Suspicious access",
                                        }
                                    ),
                                },
                            ],
                            "action_id": "access_review",
                        },
                    },
                )

        messages.append((manager, None, blocks))

    return messages


@workflow(
    description="This workflow sends Slack messages to managers for Retool access review.",
)
def retool_access_review(payload: dict[str, JsonValue]):
    groups_per_user = list_groups_per_user(secrets={"RETOOL_SECRET": "retool_secret"})
    messages = build_review_requests_as_slack_message_for_managers(
        groups_per_user=groups_per_user,
    )
    batched_send_slack_message_to_user_by_email(
        messages=messages, secrets={"SLACK_SECRET": "slack_secret"}
    )
