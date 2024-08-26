from admyral.workflow import workflow, Webhook, Schedule
from admyral.typings import JsonValue
from admyral.actions import get_jira_audit_records, send_slack_message_to_user_by_email


@workflow(
    description="Monitors Jira for newly created user accounts and sends a Slack notification with relevant details. "
    "This workflow automatically retrieves audit records for user creation events and notifies the specified recipient "
    "via Slack with the user ID and creation timestamp.",
    triggers=[Webhook(), Schedule(interval_days=1)],
)
def notification_permission_change(payload: dict[str, JsonValue]):
    # jira get audit records for newly created users
    records = get_jira_audit_records(
        filter=["User", "created"],
        start_date="2024-08-01T00:00:00",
        secrets={"JIRA_SECRET": "jira_secret"},
    )

    # notify via Slack about changes
    send_slack_message_to_user_by_email(
        email="ch.grittner@gmail.com",
        text=f"*A new user was created*\n\nUser ID: {records[0]['objectItem']['id']}\nCreated on: {records[0]['created']}",
        secrets={"SLACK_SECRET": "slack_secret"},
    )
