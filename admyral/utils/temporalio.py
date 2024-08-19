from typing import Any
from datetime import datetime

from admyral.typings import JsonValue


def serialize_datetime_in_json(obj: Any) -> JsonValue:
    """
    Function to serialize datetime objects in JSON format.
    """
    if isinstance(obj, datetime):
        return f"{obj.isoformat()}Z"
    if isinstance(obj, list):
        return [serialize_datetime_in_json(item) for item in obj]
    if isinstance(obj, dict):
        return {key: serialize_datetime_in_json(value) for key, value in obj.items()}
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    raise ValueError(
        f"Object of type {type(obj)} is not a supported type. The type must be JSON-compatible."
    )
