"""

admyral action push transform_retool_access_optimization -a workflows/retool_access_optimization.py
admyral workflow push retool_access_optimization -f workflows/retool_access_optimization.py --activate

"""

from typing import Annotated

from admyral.workflow import workflow
from admyral.typings import JsonValue
from admyral.actions import (
    list_retool_groups_and_apps_per_user,
    list_retool_used_groups_and_apps_per_user,
    join_lists,
    format_json_to_list_view_string,
    send_slack_message_to_user_by_email,
    get_time_interval_of_last_n_days,
)
from admyral.action import action, ArgumentMetadata


@action(
    display_name="Transform Users for Retool Access Optimization",
    display_namespace="Retool",
    description="Transforms the list of users for Retool access optimization workflow.",
)
def transform_retool_access_optimization(
    users: Annotated[
        list[dict[str, JsonValue]],
        ArgumentMetadata(
            display_name="Users",
            description="The list of users to transform.",
        ),
    ],
) -> list[dict[str, JsonValue]]:
    result = []
    for user in users:
        # calculate which groups have not been accessed by the user
        unused_groups = list(set(user["groups"]) - set(user["used_groups"]))
        result.append(
            {
                "User": user["user"],
                "Groups": ", ".join(user["groups"]),
                "Viewed Apps": ", ".join(user["viewed_apps"]),
                "Edited Apps": ", ".join(user["edited_apps"]),
                "Apps with Own access": ", ".join(user["apps_own_access"]),
                "Apps with Edit access": ", ".join(user["apps_edit_access"]),
                "Apps with Use access": ", ".join(user["apps_use_access"]),
                "Used Groups": ", ".join(user["used_groups"]),
                "Unused Groups": ". ".join(unused_groups),
            }
        )
    return result


@workflow(
    description="This workflow sends Slack messages to managers for Retool access review.",
)
def retool_access_optimization(payload: dict[str, JsonValue]):
    start_and_end_time = get_time_interval_of_last_n_days(
        n=60,
        only_date=True,
    )

    used_groups_and_apps_per_user = list_retool_used_groups_and_apps_per_user(
        start_date=start_and_end_time[0],
        end_date=start_and_end_time[1],
        secrets={"RETOOL_SECRET": "retool_secret"},
    )

    groups_and_apps_per_user = list_retool_groups_and_apps_per_user(
        secrets={"RETOOL_SECRET": "retool_secret"}
    )

    users = join_lists(
        list1=used_groups_and_apps_per_user,
        list1_join_key_paths=[["user"]],
        list2=groups_and_apps_per_user,
        list2_join_key_paths=[["user"]],
    )

    users = transform_retool_access_optimization(users=users)
    formatted_str = format_json_to_list_view_string(json_value=users)
    send_slack_message_to_user_by_email(
        email="daniel@admyral.ai",  # TODO: set your email here
        text=f"Retool Access Overview:\n\n{formatted_str}",
        secrets={"SLACK_SECRET": "slack_secret"},
    )
