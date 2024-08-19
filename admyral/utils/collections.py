from typing import Any


def is_empty(collection: dict | list | Any) -> bool:
    return len(collection) == 0


def is_not_empty(collection: dict | list | Any) -> bool:
    return len(collection) > 0
