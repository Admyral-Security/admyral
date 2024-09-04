from admyral.workflow import workflow
from admyral.typings import JsonValue
from admyral.actions import okta_search_users, okta_get_all_user_types


@workflow(
    description="Retrieves all user types from Okta and lists the corresponding admin users.",
)
def list_okta_admins(payload: dict[str, JsonValue]) -> list[dict[str, JsonValue]]:
    # Step 1: Get all user types
    user_types = okta_get_all_user_types()

    # Step 2: Return admin user type
    # TODO: Adjust the search query to match the wished user type
    okta_search_users(search=f"type.id eq \"{user_types[0]['id']}\"")
