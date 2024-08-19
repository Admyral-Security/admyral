import inspect
from typing import TYPE_CHECKING, Any, Callable, TypeVar
import ast
from pydantic import BaseModel
import sys

from admyral.models import ActionMetadata
from admyral.utils.json import throw_if_not_allowed_return_type
from admyral.compiler.action_parser import collect_action_arguments

if TYPE_CHECKING:
    F = TypeVar("F", bound=Callable[..., Any])


class ArgumentMetadata(BaseModel):
    display_name: str
    description: str | None = None


def _register_action(action: "Action") -> None:
    from admyral.action_registry import ActionRegistry

    ActionRegistry.register(action.action_type, action)


class Action:
    def __init__(
        self,
        func: "F",
        display_name: str,
        display_namespace: str,
        description: str | None = None,
        secrets_placeholders: list[str] = [],
        requirements: list[str] = [],
    ) -> None:
        self.display_name = display_name
        self.display_namespace = display_namespace
        self.description = description
        self.secrets_placeholders = secrets_placeholders
        self.requirements = requirements

        if self.secrets_placeholders and len(self.secrets_placeholders) != len(
            set(self.secrets_placeholders)
        ):
            raise ValueError("Secret placeholders must be unique.")

        for req in self.requirements:
            if req in sys.stdlib_module_names:
                raise ValueError(
                    f"Standard library module '{req}' should not be added to requirements because they are by default accessible."
                )

        self.func = func
        if self.is_async:
            raise ValueError("Actions cannot be async functions yet.")
        _register_action(self)

        # parse function arguments
        func_def = ast.parse(inspect.getsource(self.func)).body[0]
        self.arguments = collect_action_arguments(func_def)

    @property
    def action_type(self) -> str:
        return self.func.__name__

    @property
    def is_async(self) -> bool:
        return inspect.iscoroutinefunction(self.func)

    def _call(self, **params: dict[str, Any]) -> Any:
        result = self.func(**params)
        throw_if_not_allowed_return_type(result)
        return result

    async def _acall(self, **params: dict[str, Any]) -> Any:
        result = await self.func(**params)
        throw_if_not_allowed_return_type(result)
        return result

    def __call__(
        self,
        *,
        run_after: list[Any] = [],  # compile-time argument
        secrets: dict[str, str] = {},  # compile-time argument
        **params: Any,
    ) -> Any:
        if self.is_async:
            return self._acall(**params)
        return self._call(**params)

    # TODO: currently unused - remmove?
    def get_parameter_names(self) -> list[str]:
        func_def = ast.parse(inspect.getsource(self.func)).body[0]
        args = [arg.arg for arg in func_def.args.args]
        kwonly_args = [arg.arg for arg in func_def.args.kwonlyargs]
        if len(kwonly_args) > 1 or (
            len(kwonly_args) == 1 and kwonly_args[0] != "run_after"
        ):
            raise RuntimeError(
                "Only 'run_after' keyword-only argument is supported for actions"
            )
        return args

    def to_metadata(self) -> ActionMetadata:
        return ActionMetadata(
            action_type=self.action_type,
            display_name=self.display_name,
            display_namespace=self.display_namespace,
            description=self.description,
            secrets_placeholders=self.secrets_placeholders,
            arguments=self.arguments,
        )


def action(
    _func: "F" = None,
    *,
    display_name: str,
    display_namespace: str,
    description: str | None = None,
    secrets_placeholders: list[str] = [],
    requirements: list[str] = [],
) -> Action:
    """Decorator to create a workflow action."""

    def inner(func: "F") -> Action:
        # wrap the action with the temporal activity decorator
        action = Action(
            func,
            display_name=display_name,
            display_namespace=display_namespace,
            description=description,
            secrets_placeholders=secrets_placeholders,
            requirements=requirements,
        )
        action.__doc__ = func.__doc__
        return action

    return inner if _func is None else inner(_func)
