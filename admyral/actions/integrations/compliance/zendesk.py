from typing import Annotated, Literal
from httpx import Client

from admyral.action import action, ArgumentMetadata
from admyral.context import ctx
from admyral.typings import JsonValue
from admyral.exceptions import NonRetryableActionError


def get_zendesk_client(subdomain: str, email: str, api_token: str) -> Client:
    return Client(
        base_url=f"https://{subdomain}.zendesk.com/api",
        headers={
            "Content-Type": "application/json",
        },
        auth=(f"{email}/token", api_token),
    )


@action(
    display_name="List Users",
    display_namespace="Zendesk",
    description="List users from Zendesk ticketing system.",
    secrets_placeholders=["ZENDESK_SECRET"],
)
def list_zendesk_users(
    user_status: Annotated[
        Literal["active", "inactive"] | None,
        ArgumentMetadata(
            display_name="User Status",
            description="The status of the users to list. Possible values: active, inactive",
        ),
    ] = None,
    user_role: Annotated[
        list[Literal["end-user", "agent", "admin"]]
        | Literal["end-user", "agent", "admin"]
        | None,
        ArgumentMetadata(
            display_name="User Role",
            description="Role of user to search for. Possible values: user, admin, end-user. You can "
            'either filter for one role (e.g., admin) or for multiple roles (e.g., ["admin", "end-user"]).',
        ),
    ] = None,
) -> JsonValue:
    # https://developer.zendesk.com/api-reference/ticketing/users/users/
    secret = ctx.get().secrets.get("ZENDESK_SECRET")
    subdomain = secret["subdomain"]
    email = secret["email"]
    api_token = secret["api_token"]

    if user_role is not None:
        if isinstance(user_role, str) and user_role not in [
            "end-user",
            "agent",
            "admin",
        ]:
            raise NonRetryableActionError(
                f"Invalid user role: {user_role}. If user role is defined, it must be one of: end-user, agent, admin"
            )
        else:
            if not isinstance(user_role, list):
                raise NonRetryableActionError(
                    "User role must be a list of roles or a single role defined as a string."
                )
            for role in user_role:
                if role not in ["end-user", "agent", "admin"]:
                    raise NonRetryableActionError(
                        f"Invalid user role: {role}. If user role is defined, it must be one of: end-user, agent, admin"
                    )

    with get_zendesk_client(subdomain, email, api_token) as client:
        page = 1
        endpoint = "/v2/users.json?per_page=100&page={page}"

        if user_role is not None:
            if isinstance(user_role, list):
                roles = "&".join(f"role[]={user_role}")
            else:
                roles = f"role={user_role}"
            endpoint += f"&{roles}"

        users = []

        while True:
            response = client.get(endpoint.format(page=page))
            response.raise_for_status()
            data = response.json()
            users_page = data["users"]
            if user_status is None:
                users.extend(users_page)
            else:
                users.extend(
                    [
                        user
                        for user in users_page
                        if (user_status == "active" and user["verified"])
                        or (user_status == "inactive" and not user["verified"])
                    ]
                )

            if len(users_page) < 100:
                break
            page += 1

        return users
