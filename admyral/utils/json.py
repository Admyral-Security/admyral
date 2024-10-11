from typing import Any


def throw_if_not_allowed_return_type(obj: Any) -> None:
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return
    elif isinstance(obj, list):
        for item in obj:
            throw_if_not_allowed_return_type(item)
    elif isinstance(obj, dict):
        for key, value in obj.items():
            if not isinstance(key, str):
                raise ValueError(
                    f"Key of type {type(key)} is not allowed in the JSON object. The key must be a string."
                )
            throw_if_not_allowed_return_type(value)
    else:
        raise ValueError(
            f"Object of type {type(obj)} is not allowed in the return statement. The type must be JSON."
        )
