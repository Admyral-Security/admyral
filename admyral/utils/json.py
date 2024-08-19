from typing import Any


def _is_json_value(obj: Any) -> bool:
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return True
    elif isinstance(obj, list):
        return all(_is_json_value(item) for item in obj)
    elif isinstance(obj, dict):
        return all(
            isinstance(key, str) and _is_json_value(value) for key, value in obj.items()
        )
    else:
        return False


def is_allowed_return_type(obj: Any) -> bool:
    return _is_json_value(obj)


def throw_if_not_allowed_return_type(obj: Any) -> None:
    if not is_allowed_return_type(obj):
        raise ValueError(
            f"Object of type {type(obj)} is not allowed in the return statement. The type must be JSON."
        )
