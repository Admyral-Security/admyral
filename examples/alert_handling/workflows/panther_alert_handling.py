from admyral.workflow import workflow, Webhook
from admyral.typings import JsonValue
from admyral.actions import send_slack_message, create_jira_issue, ai_action


@workflow(
    description="This workflow handles alerts from Panther.",
    triggers=[Webhook()],
)
def panther_alert_handling(payload: dict[str, JsonValue]):
    if payload["alert"]["id"] == "AWS.ALB.HighVol400s":
        alert_summary = ai_action(
            model="gpt-4o",
            prompt=f"You are an expert security analyst. You received the subsequent alert. Can you briefly summarize "
            "it in a short and precise manner? Can you also provide a recommendation regarding investigation steps? "
            f"Here is the alert:\n{payload['alert']}",
        )

        jira_issue = create_jira_issue(
            summary=f"[{payload["alert"]["id"]}] {payload["alert"]["title"]}",
            project_id="10001",
            issue_type="Bug",
            description={
                "content": [
                    {
                        "content": [
                            {
                                "text": f"AI Alert Summary:\n{alert_summary}",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                    {
                        "content": [
                            {
                                "text": f"Alert: {payload['alert']}",
                                "type": "text",
                            }
                        ],
                        "type": "paragraph",
                    },
                ],
                "type": "doc",
                "version": 1,
            },
            labels=[
                payload["alert"]["mitre_attack"]["tactic"],
                payload["alert"]["mitre_attack"]["technique"],
            ],
            priority=payload["alert"]["severity"],
            secrets={"JIRA_SECRET": "jira_secret"},
        )

        send_slack_message(
            channel_id="TODO(user): set correct channel ID here",
            text=f"ACTION REQUIRED: High volume of web port 4xx errors to {payload['alert']['event_details']['domain_name']} in account {payload['alert']['account']}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*ACTION REQUIRED: High volume of web port 4xx errors to {payload['alert']['event_details']['domain_name']} in account {payload['alert']['account']}*",
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Please confirm whether the following alert is suspicious:",
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"AI Alert Summary:\n{alert_summary}",
                    },
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"```\n{payload['alert']}\n```"},
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"Jira Ticket: https://christesting123.atlassian.net/browse/{jira_issue['key']}",
                    },
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "action_id": "panther_alert_handling-suspicious",
                            "value": jira_issue["id"],
                            "text": {
                                "type": "plain_text",
                                "text": "Suspicious alert",
                            },
                        },
                        {
                            "type": "button",
                            "action_id": "panther_alert_handling-non-suspicious",
                            "value": jira_issue["id"],
                            "text": {
                                "type": "plain_text",
                                "text": "Non-suspicious alert",
                            },
                        },
                    ],
                },
            ],
            secrets={"SLACK_SECRET": "slack_secret"},
        )
