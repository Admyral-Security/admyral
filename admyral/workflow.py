from typing import TypeVar, Callable, Any

from admyral.typings import JsonValue
from admyral.models import WorkflowDAG
from admyral.compiler.workflow_compiler import WorkflowCompiler


T = TypeVar("T", bound="Workflow")
F = TypeVar("F", bound=Callable[..., None])


class Webhook:
    def __init__(self, **default_args: dict[str, JsonValue]) -> None:
        super().__init__()
        self.default_args = default_args


class Schedule:
    def __init__(
        self,
        cron: str | None = None,
        interval_seconds: int | None = None,
        interval_minutes: int | None = None,
        interval_hours: int | None = None,
        interval_days: int | None = None,
        **default_args: dict[str, JsonValue],
    ) -> None:
        self.cron = cron
        self.interval_seconds = interval_seconds
        self.interval_minutes = interval_minutes
        self.interval_hours = interval_hours
        self.interval_days = interval_days
        self.default_args = default_args


class Workflow:
    def __init__(
        self,
        func: F,
        *,
        triggers: list[Webhook | Schedule] = [],
        description: str | None = None,
    ) -> None:
        self.func = func
        self.description = description
        self.triggers = triggers

    def compile(self) -> WorkflowDAG:
        return WorkflowCompiler().compile(self)

    @property
    def name(self) -> str:
        return self.func.__name__

    def __call__(self, payload: dict[str, JsonValue]) -> Any:
        """Call the wrapped workflow function."""
        return self.func(payload)


# TODO: type overload + correct return type
def workflow(
    _func: F = None,
    *,
    description: str | None = None,
    triggers: list[Webhook | Schedule] = [],
) -> Workflow:
    """Decorator to create a workflow."""

    def inner(func: "F") -> Workflow:
        w = Workflow(func, description=description, triggers=triggers)
        w.__doc__ = func.__doc__
        return w

    return inner if _func is None else inner(_func)
