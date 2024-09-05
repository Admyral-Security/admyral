from typing import Annotated
from admyral.typings import JsonValue
from admyral.action import action, ArgumentMetadata


@action(
    display_name="Output the input",
    display_namespace="General Actions",
    description="Print your input",
)
def input_to_output(
    input_test: Annotated[
        JsonValue,
        ArgumentMetadata(display_name="input string", description="Test"),
    ],
) -> str:
    return input_test
