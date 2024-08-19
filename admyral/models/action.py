from pydantic import BaseModel

from admyral.typings import JsonValue


# class ArgumentType(str, Enum):
#     STRING = "string"
"""
Types:

- str
- int, float
- JsonValue
- list
- dict
- None



- required => some type does not contain None
    - can have a default value
- optional => can be None (where None must be set explicitly)
    - default is None or something else

"""


class Argument(BaseModel):
    arg_name: str
    display_name: str
    description: str
    arg_type: str  # TODO: make this an enum
    is_optional: bool
    default_value: JsonValue | None


class PythonAction(BaseModel):
    """
    Model for a custom Python action.
    """

    action_type: str
    import_statements: str
    code: str
    arguments: list[Argument]

    # decorator arguments
    display_name: str
    display_namespace: str
    description: str | None = None
    secrets_placeholders: list[str] | None = None
    requirements: list[str] | None = None


class ActionMetadata(BaseModel):
    action_type: str
    display_name: str
    display_namespace: str
    description: str | None = None
    secrets_placeholders: list[str] = []
    arguments: list[Argument] = []
