from admyral.action import action
from admyral.typings import JsonValue


# TODO: common schema for alerts?
@action(
    secrets_placeholders=["DB_URI"],
)
def load_into_database() -> JsonValue:
    raise NotImplementedError("This action is not implemented yet")
