"""

admyral action push transform_retool_access_optimization -a workflows/retool_access_optimization/retool_access_optimization.py
admyral workflow push workflows/retool_access_optimization/retool_access_optimization.yaml --activate

"""

from typing import Annotated

from admyral.typings import JsonValue
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
