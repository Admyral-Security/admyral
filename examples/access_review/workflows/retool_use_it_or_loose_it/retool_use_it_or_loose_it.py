from typing import Annotated
import json

from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata


@action(
    display_name="Build Retool Inactivity Question as Slack Messages",
    display_namespace="Use It or Loose It",
    description="Build a list of Slack messages to send to inactive Retool users "
    "and asking them whether they still need access.",
)
def build_retool_inactivity_question_as_slack_messages(
    inactive_users: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Inactive Users",
            description="A list of inactive users to send messages to.",
        ),
    ],
) -> list[tuple[str, str | None, JsonValue]]:
    messages = []
    for user in inactive_users:
        messages.append(
            (
                user["email"],
                f"Hello {user['first_name']}, you have not logged into Retool for a while. "
                "Please confirm if you still need access.",
                [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"Hello {user['first_name']}, you have not logged into Retool for a while. "
                            "Please confirm if you still need access.",
                        },
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "action_id": "use_it_or_loose_it-yes",
                                "value": json.dumps(
                                    {
                                        "user": user["email"],
                                        "workflow": "use_it_or_loose_it",
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
                                "action_id": "use_it_or_loose_it-no",
                                "value": json.dumps(
                                    {
                                        "user": user["email"],
                                        "workflow": "use_it_or_loose_it",
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
    return messages
