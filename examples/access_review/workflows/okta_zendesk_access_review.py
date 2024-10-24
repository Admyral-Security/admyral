from admyral.workflow import workflow
from admyral.typings import JsonValue
from admyral.actions import (
    okta_search_users,
    list_zendesk_users,
    build_lookup_table,
    filter,
    format_json_to_list_view_string,
    send_slack_message,
)


@workflow(
    description="Verify that there is no Zendesk users which is not an active Okta account.",
)
def okta_zendesk_access_review(payload: dict[str, JsonValue]):
    okta_users = okta_search_users(
        query='status eq "ACTIVE"',
        secrets={"OKTA_SECRET": "okta_secret"},
    )
    okta_user_table = build_lookup_table(
        input_list=okta_users, key_path=["profile", "email"]
    )

    zendesk_users = list_zendesk_users(
        user_status="active",
        user_role=["agent", "admin"],
        secrets={"ZENDESK_SECRET": "zendesk_secret"},
    )
    invalid_zendesk_users = filter(
        input_list=zendesk_users,
        filter="x['email'] not in okta_users",
        values={"okta_users": okta_user_table},
    )
    if invalid_zendesk_users:
        invalid_zendesk_users_str = format_json_to_list_view_string(
            json_value=invalid_zendesk_users
        )
        send_slack_message(
            channel_id="C06QP0KV1L2",
            text=f"Found Zendesk users with no active Okta account:\n{invalid_zendesk_users_str}",
            secrets={"SLACK_SECRET": "slack_secret"},
        )
