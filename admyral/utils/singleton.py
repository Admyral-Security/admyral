from typing import Any


class Singleton(type):
    """
    Metaclass for Singleton.
    Source: https://stackoverflow.com/a/33201
    """

    def __init__(cls, *args: Any, **kwargs: Any) -> None:
        super(Singleton, cls).__init__(*args, **kwargs)
        cls._instance = None

    def __call__(cls, *args: Any, **kwds: Any) -> Any:
        if cls._instance is None:
            cls._instance = super(Singleton, cls).__call__(*args, **kwds)
        return cls._instance
