from admyral.workflow import workflow, Webhook
from admyral.typings import JsonValue
from admyral.actions import (
    send_slack_message,
    deserialize_json_string,
)


"""
Setup

1. Create a Slack app (https://api.slack.com/apps)
2. Go to "Interactivity & Shortcuts" and enable interactivity
3. In the Request URL field enter the URL of the Admyral Webhook trigger

"""


@workflow(
    description="This workflow handles Slack interactivity responses.",
    triggers=[Webhook()],
)
def slack_interactivity(payload: dict[str, JsonValue]):
    # Workflow: Use it or loose it
    if payload["actions"][0]["action_id"] == "use_it_or_loose_it-no":
        value = deserialize_json_string(serialized_json=payload["actions"][0]["value"])
        send_slack_message(
            channel_id="TODO(user): set Slack channel ID",
            text=f"Please deactivate Retool access for the following user: {value["user"]}. Reason: User responded with no longer needed.",
            secrets={"SLACK_SECRET": "slack_secret"},
        )

    # Workflow: Access Review
    if payload["actions"][0]["action_id"] == "access_review":
        value = deserialize_json_string(
            serialized_json=payload["actions"][0]["selected_option"]["value"]
        )
        if value["response"] == "remove":
            send_slack_message(
                channel_id="TODO(user): set Slack channel ID",
                text=f"Please remove the user {value['user']} from the group \"{value['group']}\" in Retool. Reason: {value['reason']}",
                secrets={"SLACK_SECRET": "slack_secret"},
            )
