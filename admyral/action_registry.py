from typing import TypeVar, Any, Callable

from admyral.utils.singleton import Singleton
from admyral.action import Action


F = TypeVar("F", bound=Callable[..., Any])


_RESERVED_ACTION_TYPES = {"start", "end", "if_condition", "note", "python"}


class ActionRegistry(metaclass=Singleton):
    _actions: dict[str, Action] = {}

    @classmethod
    def register(cls, type_name: str, action: Action) -> None:
        if type_name in cls._actions:
            raise ValueError(f"Action with type '{type_name}' already exists")
        if type_name in _RESERVED_ACTION_TYPES:
            raise ValueError(
                f"Action with type '{type_name}' is a reserved action. Please choose a different function name."
            )
        cls._actions[type_name] = action

    @classmethod
    def get_action_types(cls) -> set[str]:
        return set(cls._actions.keys())

    @classmethod
    def get_actions(cls) -> list[Action]:
        return list(cls._actions.values())

    @classmethod
    def get(cls, type_name: str) -> Action:
        if type_name not in cls._actions:
            raise ValueError(f"Action with type '{type_name}' does not exist")
        return cls._actions[type_name]

    @classmethod
    def get_or_none(cls, type_name: str) -> Action | None:
        return cls._actions.get(type_name)

    @classmethod
    def is_registered(cls, type_name: str) -> bool:
        return type_name in cls._actions

    @classmethod
    def deregister(cls, type_name: str) -> None:
        if type_name in cls._actions:
            del cls._actions[type_name]


# needs to be defined after ActionRegistry, such that ActionRegistry is fully defined
# before any action is registered
from admyral.actions import *  # noqa: E402,F403
