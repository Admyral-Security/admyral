from typing import Annotated, Literal
from httpx import Client, HTTPStatusError
from collections import defaultdict
from dateutil import parser
from datetime import datetime, timezone, timedelta
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
    retry_if_exception_type,
)
import itertools
from pydantic import BaseModel

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.exceptions import NonRetryableActionError, RetryableActionError
from admyral.secret.secret import register_secret


@register_secret(secret_type="Retool")
class RetoolSecret(BaseModel):
    domain: str
    api_key: str


def get_retool_client(secret: RetoolSecret) -> Client:
    # Auth: https://docs.retool.com/org-users/guides/retool-api/authentication#tag/Organization/paths/~1usage~1organizations/get
    return Client(
        base_url=f"https://{secret.domain}/api/v2",
        headers={
            "Authorization": f"Bearer {secret.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )


@retry(
    stop=stop_after_attempt(15),
    wait=wait_random_exponential(multiplier=1, max=90),
    retry=retry_if_exception_type(RetryableActionError),  # Don't retry on 4xx errors
    reraise=True,
)
def _list_retool_api(
    client: Client,
    url: str,
    next_token: str | None = None,
    method: Literal["get", "post"] = "get",
    json_body: dict = {},
    params: dict = {},
) -> dict[str, JsonValue]:
    if next_token is not None:
        params["next_token"] = next_token

    try:
        if method == "post":
            response = client.post(url, json=json_body, params=params)
        else:
            response = client.get(url, params=params)
        response.raise_for_status()
        response_json = response.json()

        if not response_json["success"]:
            raise NonRetryableActionError(
                f"Failed to call Retool API: {response_json['message']}"
            )

        return response_json

    except HTTPStatusError as e:
        if e.response.status_code == 429:  # Rate limit exceeded
            raise RetryableActionError("Rate limit exceeded")
        if e.response.status_code >= 500:  # Server error
            raise RetryableActionError(f"Server error: {e.response.text}")
        raise NonRetryableActionError(f"Failed to call Retool API: {e.response.text}")


def _list_retool_api_with_pagination(
    client: Client,
    url: str,
    method: Literal["get", "post"] = "get",
    json_body: dict = {},
) -> list[dict[str, JsonValue]]:
    data = []

    next_token = None
    while True:
        response = _list_retool_api(client, url, next_token, method, json_body)
        data.extend(response["data"])

        next_token = response.get("next_token")
        if not response.get("has_more"):
            break

    return data


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
    secret = RetoolSecret.model_validate(secret)

    with get_retool_client(secret) as client:
        users = _list_retool_api_with_pagination(client, "/users")
        utc_time_now = datetime.now(timezone.utc) - timedelta(
            days=inactivity_threshold_in_days
        )
        return [
            user
            for user in users
            if parser.isoparse(user["last_active"]) <= utc_time_now
        ]


@action(
    display_name="List Groups per User",
    display_namespace="Retool",
    description="List all groups a user is a member of as well as the last time a user was active in Retool.",
    secrets_placeholders=["RETOOL_SECRET"],
)
def list_retool_groups_per_user() -> dict[str, JsonValue]:
    # Get all permission groups for an organization or space. The API token must have the "Groups > Read" scope.
    # https://docs.retool.com/reference/api/#tag/Users/paths/~1users~1%7BuserId%7D/patch
    # https://docs.retool.com/reference/api/v2/#tag/Groups/paths/~1groups~1%7BgroupId%7D/put

    secret = ctx.get().secrets.get("RETOOL_SECRET")
    secret = RetoolSecret.model_validate(secret)

    with get_retool_client(secret) as client:
        # Fetch all users to get the last active date
        users = _list_retool_api_with_pagination(client, "/users")

        groups_per_user = {
            user["email"]: {
                "groups": [],
                "last_active": user["last_active"],
            }
            for user in users
        }

        # Fetch all groups
        groups = _list_retool_api_with_pagination(client, "/groups")
        for group in groups:
            for member in group["member"]:
                groups_per_user[member]["groups"].append(group["name"])

        return groups_per_user


@action(
    display_name="List Groups and Apps per User",
    display_namespace="Retool",
    description="List all groups a user is a member of and all the apps a user has access to.",
    secrets_placeholders=["RETOOL_SECRET"],
)
def list_retool_groups_and_apps_per_user() -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("RETOOL_SECRET")
    secret = RetoolSecret.model_validate(secret)

    with get_retool_client(secret) as client:
        # https://docs.retool.com/reference/api/#tag/Users/paths/~1users/get
        users = _list_retool_api_with_pagination(client, "/users")

        user_to_groups_and_apps = {
            user["email"]: {
                "user": user["email"],
                "groups": [],
                "apps_own_access": set(),
                "apps_edit_access": set(),
                "apps_use_access": set(),
            }
            for user in users
        }

        # https://docs.retool.com/reference/api/#tag/Groups/paths/~1groups/get
        groups = _list_retool_api_with_pagination(client, "/groups")

        # use cache to avoid hitting the /apps/{appId} endpoint multiple times
        app_details_cache = {}

        for group in groups:
            # List apps (object_type == "app") a group can access
            # https://docs.retool.com/reference/api/#tag/Groups/paths/~1permissions~1listObjects/post
            body = {
                "subject": {
                    "type": "group",
                    "id": group["id"],
                },
                "object_type": "app",
            }
            group_accessible_apps = _list_retool_api_with_pagination(
                client, "/permissions/listObjects", method="post", json_body=body
            )

            # fetch the app name
            apps_by_access_level = defaultdict(list)
            VALID_ACCESS_LEVELS = {"own", "edit", "use"}

            for app_access in group_accessible_apps:
                app_id = app_access["id"]
                access_level = app_access["access_level"]
                if access_level not in VALID_ACCESS_LEVELS:
                    raise ValueError(
                        f"Invalid access level: {access_level}. Expected one of: {VALID_ACCESS_LEVELS}"
                    )

                # https://docs.retool.com/reference/api/#tag/Apps/paths/~1apps~1%7BappId%7D/get
                app_details = app_details_cache.get(app_id)
                if app_details is None:
                    app_details = _list_retool_api(client, f"/apps/{app_id}")
                    app_details_cache[app_id] = app_details["data"]

                apps_by_access_level[access_level].append(app_details["name"])

            # merge with user information
            for member in group["members"]:
                user_to_groups_and_apps[member]["groups"].append(group["name"])
                user_to_groups_and_apps[member]["apps_own_access"].update(
                    apps_by_access_level.get("own", [])
                )
                user_to_groups_and_apps[member]["apps_edit_access"].update(
                    apps_by_access_level.get("edit", [])
                )
                user_to_groups_and_apps[member]["apps_use_access"].update(
                    apps_by_access_level.get("use", [])
                )

        return list(
            {
                "user": user["user"],
                "groups": user["groups"],
                "apps_own_access": list(user["apps_own_access"]),
                "apps_edit_access": list(user["apps_edit_access"]),
                "apps_use_access": list(user["apps_use_access"]),
            }
            for user in user_to_groups_and_apps.values()
        )


def _validate_date_format(date_str: str) -> str:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        raise ValueError(
            f"Invalid date format: {date_str}. Expected format: YYYY-MM-DD"
        )


@action(
    display_name="List Used Groups and Apps per User",
    display_namespace="Retool",
    description="List all apps a user has used as viewer and/or editor within a certain time range.",
    secrets_placeholders=["RETOOL_SECRET"],
)
def list_retool_used_groups_and_apps_per_user(
    start_date: Annotated[
        str,
        ArgumentMetadata(
            display_name="Start Date",
            description="The start date of the time range. Example: 2022-01-01",
        ),
    ],
    end_date: Annotated[
        str | None,
        ArgumentMetadata(
            display_name="End Date",
            description="The end date of the time range. If not specified, then minimum(start_date + 30 days, today - 1) is used. Example: 2022-12-31",
        ),
    ] = None,
) -> list[dict[str, JsonValue]]:
    secret = ctx.get().secrets.get("RETOOL_SECRET")
    secret = RetoolSecret.model_validate(secret)

    start_date = _validate_date_format(start_date)
    if end_date is not None:
        end_date = _validate_date_format(end_date)

    with get_retool_client(secret) as client:
        app_id_to_groups = defaultdict(list)
        # https://docs.retool.com/reference/api/#tag/Groups/paths/~1groups/get
        groups = _list_retool_api_with_pagination(client, "/groups")
        for group in groups:
            # List apps (object_type == "app") a group can access
            # https://docs.retool.com/reference/api/#tag/Groups/paths/~1permissions~1listObjects/post
            body = {
                "subject": {
                    "type": "group",
                    "id": group["id"],
                },
                "object_type": "app",
            }
            apps = _list_retool_api_with_pagination(
                client, "/permissions/listObjects", method="post", json_body=body
            )

            for app in apps:
                app_id_to_groups[app["id"]].append(group["name"])

        result = []

        # https://docs.retool.com/reference/api/#tag/Users/paths/~1users/get
        users = _list_retool_api_with_pagination(client, "/users")

        for user in users:
            # fetch the app usage for the user
            # https://docs.retool.com/reference/api/#tag/Usage/paths/~1usage~1user_details/get
            params = {
                "start_date": start_date,
                "email": user["email"],
            }
            if end_date is not None:
                params["end_date"] = end_date
            response = _list_retool_api(client, "/usage/user_details", params=params)
            user_details = response["data"]

            # calculate the groups the user has used
            used_groups = set(
                itertools.chain.from_iterable(
                    app_id_to_groups[app["id"]]
                    for app in user_details["editor_summary"]
                )
            ) | set(
                itertools.chain.from_iterable(
                    app_id_to_groups[app["id"]]
                    for app in user_details["viewer_summary"]
                )
            )
            used_groups = list(used_groups)

            result.append(
                {
                    "user": user["email"],
                    "viewed_apps": list(
                        app["app_name"] for app in user_details["viewer_summary"]
                    ),
                    "edited_apps": list(
                        app["app_name"] for app in user_details["editor_summary"]
                    ),
                    "used_groups": used_groups,
                }
            )

        return result
