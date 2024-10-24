from typing import Annotated
import json
import time
from datetime import datetime, timedelta, UTC
import yaml
from copy import deepcopy

from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue
from admyral.context import ctx
from admyral.compiler.condition_compiler import compile_condition_str
from admyral.workers.if_condition_executor import (
    ConditionReferenceResolution,
    ConditionEvaluator,
)


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


@action(
    display_name="Wait",
    display_namespace="Admyral",
    description="Waits for a specified number of seconds.",
)
def wait(
    seconds: Annotated[
        int,
        ArgumentMetadata(
            display_name="Seconds",
            description="Number of seconds to wait.",
        ),
    ],
) -> None:
    time.sleep(seconds)


@action(
    display_name="Transform",
    display_namespace="Admyral",
    description="Transforms a JSON.",
)
def transform(
    value: Annotated[
        JsonValue,
        ArgumentMetadata(
            display_name="Value",
            description="A JSON value.",
        ),
    ],
) -> JsonValue:
    return value


@action(
    display_name="Get Time Interval of Last N Hours",
    display_namespace="Admyral",
    description="Get the time interval of the last N hours. A list of length 2 containing the start and end time is returned.",
)
def get_time_interval_of_last_n_hours(
    n_hours: Annotated[
        int,
        ArgumentMetadata(
            display_name="Number of Hours",
            description="Number of hours to go back.",
        ),
    ] = 1,
) -> list[str]:
    end_time = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    start_time = (
        (end_time - timedelta(hours=n_hours)).isoformat().replace("+00:00", "Z")
    )
    return [start_time, end_time.isoformat().replace("+00:00", "Z")]


@action(
    display_name="Get Time Interval of Last N Days",
    display_namespace="Admyral",
    description="Get the time interval of the last N days. A list of length 2 containing the start and end time is returned.",
)
def get_time_interval_of_last_n_days(
    n_days: Annotated[
        int,
        ArgumentMetadata(
            display_name="Number of Days",
            description="Number of days to go back.",
        ),
    ] = 1,
) -> list[str]:
    end_time = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    start_time = (end_time - timedelta(days=n_days)).isoformat().replace("+00:00", "Z")
    return [start_time, end_time.isoformat().replace("+00:00", "Z")]


@action(
    display_name="Format JSON to List View String",
    display_namespace="Admyral",
    description="Converts a JSON value to a list view string (YAML format).",
)
def format_json_to_list_view_string(
    json_value: Annotated[
        JsonValue,
        ArgumentMetadata(
            display_name="JSON",
            description="A JSON value.",
        ),
    ],
) -> str:
    return yaml.dump(json_value, default_flow_style=False)


@action(
    display_name="Send to Workflow",
    display_namespace="Admyral",
    description="Sends data to a workflow.",
)
def send_to_workflow(
    workflow_name: Annotated[
        str,
        ArgumentMetadata(
            display_name="Workflow Name",
            description="The name of the workflow to send the data to.",
        ),
    ],
    payload: Annotated[
        JsonValue,
        ArgumentMetadata(
            display_name="Payload",
            description="Payload to send to the workflow.",
        ),
    ],
) -> None:
    ctx.get().send_to_workflow_sync(workflow_name, payload)


# TODO: remove with the introduction of for-loops
@action(
    display_name="Send List Elements to a Workflow",
    display_namespace="Admyral",
    description="WARNING: This action is temporary and will be deprecated as soon as For Loops are released. Sends a list of elements to a workflow.",
)
def send_list_elements_to_workflow(
    workflow_name: Annotated[
        str,
        ArgumentMetadata(
            display_name="Workflow Name",
            description="The name of the workflow to send the elements to.",
        ),
    ],
    elements: Annotated[
        list[JsonValue],
        ArgumentMetadata(
            display_name="Elements",
            description="A list of elements to send to the workflow.",
        ),
    ],
    shared_data: Annotated[
        JsonValue | None,
        ArgumentMetadata(
            display_name="Shared Data",
            description="Shared data to send to the workflow.",
        ),
    ] = None,
) -> None:
    for element in elements:
        send_to_workflow(
            workflow_name=workflow_name,
            payload={
                "element": element,
                "shared": shared_data,
            },
        )


@action(
    display_name="Split Text",
    display_namespace="Admyral",
    description="Splits a text into a list of strings.",
)
def split_text(
    text: Annotated[
        str, ArgumentMetadata(display_name="Text", description="The text to split.")
    ],
    pattern: Annotated[
        str,
        ArgumentMetadata(
            display_name="Pattern", description="The pattern to split by."
        ),
    ],
) -> list[str]:
    return text.split(pattern)


@action(
    display_name="Build Lookup Table",
    display_namespace="Admyral",
    description="Builds a lookup table from an array of objects.",
)
def build_lookup_table(
    input_list: Annotated[
        list[JsonValue],
        ArgumentMetadata(
            display_name="Input List",
            description="A list of objects to build the lookup table from.",
        ),
    ],
    key_path: Annotated[
        list[str],
        ArgumentMetadata(
            display_name="Key Path",
            description='The key path to use as the lookup key (e.g., ["email"]).',
        ),
    ],
) -> dict[str, JsonValue]:
    lookup_table = {}
    for obj in input_list:
        key = obj
        for key_part in key_path:
            key = key[key_part]
        lookup_table[key] = obj
    return lookup_table


@action(
    display_name="Filter",
    display_namespace="Admyral",
    description="Filters a list of objects by a condition. The action iterates over the list of objects and applies a filter to each object. "
    "When the condition evaluates to false, then the object is removed from the list. The current object in the filter condition is represented by 'x'. "
    "In order to use results from previous actions in the filter condition, you can use the 'values' parameter.",
)
def filter(
    input_list: Annotated[
        list[JsonValue],
        ArgumentMetadata(
            display_name="Input List",
            description="The list of objects to filter.",
        ),
    ],
    filter: Annotated[
        str,
        ArgumentMetadata(
            display_name="Filter",
            description="The filter condition (e.g., \"x['email'] not in okta_users\"). Note: The current object is represented by 'x'.",
        ),
    ],
    values: Annotated[
        dict[str, JsonValue],
        ArgumentMetadata(
            display_name="Values",
            description='Values (results from previous actions) to use in the filter condition for comparisons (e.g., {"okta_users": okta_users}).',
        ),
    ],
) -> list[JsonValue]:
    compiled_filter_expr = compile_condition_str(filter)
    filtered_input_list = []
    for x in input_list:
        values["x"] = x
        copy_compiled_filter_expr = deepcopy(compiled_filter_expr)
        expr = ConditionReferenceResolution(values).resolve_references(
            copy_compiled_filter_expr
        )
        if ConditionEvaluator().evaluate(expr):
            filtered_input_list.append(x)
    return filtered_input_list
