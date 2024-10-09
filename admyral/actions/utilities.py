from typing import Annotated
import json
import time
from datetime import datetime, timedelta, UTC
import yaml

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
