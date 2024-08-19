from typing import Annotated
import json

from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue


@action(
    display_name="Deserialize JSON String",
    display_namespace="Admyral",
    description="Deserializes a JSON string.",
)
def deserialize_json_string(
    serialized_json: Annotated[
        str,
        ArgumentMetadata(
            display_name="Serialized JSON String",
            description="Deserialized JSON string.",
        ),
    ],
) -> JsonValue:
    return json.loads(serialized_json)


@action(
    display_name="Serialize JSON String",
    display_namespace="Admyral",
    description="Serializes a JSON string.",
)
def serialize_json_string(
    json_value: Annotated[
        JsonValue,
        ArgumentMetadata(
            display_name="JSON",
            description="A JSON value.",
        ),
    ],
) -> str:
    return json.dumps(json_value)
