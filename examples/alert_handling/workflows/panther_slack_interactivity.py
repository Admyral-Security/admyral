from admyral.workflow import workflow, Webhook
from admyral.typings import JsonValue
from admyral.actions import (
    update_jira_issue_status,
    comment_jira_issue_status,
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
    # Workflow: Panther Alert Handling
    if payload["actions"][0]["action_id"] == "panther_alert_handling-suspicious":
        jira_comment = comment_jira_issue_status(
            issue_id_or_key=payload["actions"][0]["value"],
            comment={
                "content": [
                    {
                        "content": [
                            {
                                "text": "Alert was flagged as suspicious.",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                ],
                "type": "doc",
                "version": 1,
            },
            secrets={"JIRA_SECRET": "jira_secret"},
        )

    if payload["actions"][0]["action_id"] == "panther_alert_handling-non-suspicious":
        jira_comment = comment_jira_issue_status(
            issue_id_or_key=payload["actions"][0]["value"],
            comment={
                "content": [
                    {
                        "content": [
                            {
                                "text": "Alert was flagged as non-suspicious. Issue is automatically closed.",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                ],
                "type": "doc",
                "version": 1,
            },
            secrets={"JIRA_SECRET": "jira_secret"},
        )
        update_jira_issue_status(
            issue_id_or_key=payload["actions"][0]["value"],
            transition_id="31",
            secrets={"JIRA_SECRET": "jira_secret"},
            run_after=[jira_comment],
        )
