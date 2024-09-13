from typing import TYPE_CHECKING, TypeVar, Callable, Any
from temporalio import activity
import inspect
from uuid import uuid4
import time

from admyral.context import ExecutionContext
from admyral.utils.json import throw_if_not_allowed_return_type
from admyral.utils.future_executor import execute_future
from admyral.logger import get_logger
from admyral.context import ctx
from admyral.secret.secrets_access import Secrets, SecretsStoreAccessImpl
from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.typings import JsonValue
from admyral.exceptions import NonRetryableActionError

if TYPE_CHECKING:
    F = TypeVar("F", bound=Callable[..., Any])

logger = get_logger(__name__)


def action_executor(action_type: str, func: "F") -> "F":
    if inspect.iscoroutinefunction(func):

        @activity.defn(name=action_type)
        async def async_execute(
            ctx_dict: dict, secret_mappings: dict[str, str], args: dict[str, Any]
        ) -> tuple[str, Any]:
            logger.info(f"Executing async action: {action_type}")

            exec_ctx = ExecutionContext(**ctx_dict)
            exec_ctx.step_id = str(uuid4())

            try:
                exec_ctx.secrets = Secrets(
                    SecretsStoreAccessImpl(
                        user_id=exec_ctx.user_id,
                        secret_mappings=secret_mappings,
                        secrets_manager=SharedWorkerState.get_secrets_manager(),
                    )
                )

                # make available to the function as a contextvar
                ctx.set(exec_ctx)
                # for wait actions, we skip the function call because the waiting is already executed in the WorkflowExecutor
                if exec_ctx.action_type != "wait":
                    logger.info(f"Executing {action_type}...")
                    start = time.time()
                    result = await func(**args)
                    end = time.time()
                    logger.info(
                        f"Finished execution of {action_type} (async) in {int((end - start) * 1000)}ms"
                    )
                else:
                    result = None
                throw_if_not_allowed_return_type(result)
            except Exception as e:
                # Store error
                await _store_action_error(exec_ctx, str(e), args)
                raise NonRetryableActionError(str(e))

            await _store_action_result(exec_ctx, result, args)

            return exec_ctx.step_id, result

        return async_execute

    else:

        @activity.defn(name=action_type)
        def sync_execute(
            ctx_dict: dict, secret_mappings: dict[str, str], args: dict[str, Any]
        ) -> tuple[str, Any]:
            logger.info(f"Executing sync action: {action_type}")

            exec_ctx = ExecutionContext(**ctx_dict)
            exec_ctx.step_id = str(uuid4())

            try:
                exec_ctx.secrets = Secrets(
                    SecretsStoreAccessImpl(
                        user_id=exec_ctx.user_id,
                        secret_mappings=secret_mappings,
                        secrets_manager=SharedWorkerState.get_secrets_manager(),
                    )
                )

                # make available to the function as a contextvar
                ctx.set(exec_ctx)

                # for wait actions, we skip the function call because the waiting is already executed in the WorkflowExecutor
                if exec_ctx.action_type != "wait":
                    logger.info(f"Executing {action_type}...")
                    start = time.time()
                    result = func(**args)
                    end = time.time()
                    logger.info(
                        f"Finished execution of {action_type} (sync) in {int((end - start) * 1000)}ms"
                    )
                else:
                    result = None
                throw_if_not_allowed_return_type(result)
            except Exception as e:
                # Store error
                execute_future(_store_action_error(exec_ctx, str(e), args))
                raise NonRetryableActionError(str(e))

            execute_future(_store_action_result(exec_ctx, result, args))

            return exec_ctx.step_id, result

        return sync_execute


async def _store_action_result(
    exec_ctx: ExecutionContext, result: JsonValue, args: dict[str, Any]
) -> None:
    await SharedWorkerState.get_store().store_action_result(
        exec_ctx.step_id,
        exec_ctx.run_id,
        exec_ctx.action_type,
        exec_ctx.prev_step_id,
        result,
        args,
    )


async def _store_action_error(
    exec_ctx: ExecutionContext, error: str, args: dict[str, Any]
) -> None:
    await SharedWorkerState.get_store().store_workflow_run_error(
        exec_ctx.step_id,
        exec_ctx.run_id,
        exec_ctx.action_type,
        exec_ctx.prev_step_id,
        error,
        args,
    )
