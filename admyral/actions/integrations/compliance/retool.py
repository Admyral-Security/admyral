from typing import Annotated
from httpx import Client
from collections import defaultdict
from dateutil import parser
from datetime import datetime, timezone, timedelta

from admyral.action import action, ArgumentMetadata

from admyral.context import ctx
from admyral.typings import JsonValue


def get_retool_client(domain: str, api_key: str) -> Client:
    # Auth: https://docs.retool.com/org-users/guides/retool-api/authentication#tag/Organization/paths/~1usage~1organizations/get
    return Client(
        base_url=f"https://{domain}/api/v2",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@action(
    display_name="List Inactive Retool Users",
    display_namespace="Retool",
    description="This method lists Retool users who have not logged in for a specified number of days.",
    secrets_placeholders=["RETOOL_SECRET"],
)
def list_retool_inactive_users(
    inactivity_threshold_in_days: Annotated[
        int,
        ArgumentMetadata(
            display_name="Inactivity Threshold in Days",
            description="The number of days since the last login after which a user is considered inactive.",
        ),
    ] = 60,
) -> list[dict[str, JsonValue]]:
    # Returns a list of users. The API token must have the "Users > Read" scope.
    # https://docs.retool.com/reference/api/#tag/Users/paths/~1users~1%7BuserId%7D/patch

    secret = ctx.get().secrets.get("RETOOL_SECRET")
    api_key = secret["api_key"]
    domain = secret["domain"]

    with get_retool_client(domain, api_key) as client:
        # TODO: handle pageination
        response = client.get("/users")
        response.raise_for_status()
        response_json = response.json()

        if not response_json["success"]:
            raise RuntimeError(
                f"Failed to list Retool users: {response_json['message']}"
            )

        utc_time_now = datetime.now(timezone.utc) - timedelta(
            days=inactivity_threshold_in_days
        )

        return [
            user
            for user in response_json["data"]
            if parser.isoparse(user["last_active"]) <= utc_time_now
        ]


@action(
    display_name="List Groups per User",
    display_namespace="Retool",
    description="List all groups a user is a member of as well as the last time a user was active in Retool.",
    secrets_placeholders=["RETOOL_SECRET"],
)
def list_groups_per_user() -> dict[str, JsonValue]:
    # Get all permission groups for an organization or space. The API token must have the "Groups > Read" scope.
    # https://docs.retool.com/reference/api/#tag/Users/paths/~1users~1%7BuserId%7D/patch
    # https://docs.retool.com/reference/api/v2/#tag/Groups/paths/~1groups~1%7BgroupId%7D/put

    secret = ctx.get().secrets.get("RETOOL_SECRET")
    api_key = secret["api_key"]
    domain = secret["domain"]

    with get_retool_client(domain, api_key) as client:
        # Fetch all users to get the last active date
        response = client.get("/users")
        response.raise_for_status()
        response_json = response.json()

        if not response_json["success"]:
            raise RuntimeError(
                f"Failed to list Retool users: {response_json['message']}"
            )

        groups_per_user = {
            user["email"]: {
                "groups": defaultdict(list),
                "last_active": user["last_active"],
            }
            for user in response_json["data"]
        }

        # Fetch all groups
        response = client.get("/groups")
        response.raise_for_status()
        response_json = response.json()

        if not response_json["success"]:
            raise RuntimeError(
                f"Failed to list Retool groups: {response_json['message']}"
            )

        for group in response_json["data"]:
            for member in group["member"]:
                groups_per_user[member]["groups"].append(group["name"])

        return groups_per_user
