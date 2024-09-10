import pytest
from typing import Annotated
import time

from tests.workers.utils import execute_test_workflow

from admyral.db.admyral_store import AdmyralStore
from admyral.workflow import workflow
from admyral.action import action, ArgumentMetadata
from admyral.typings import JsonValue
from admyral.workers.action_executor import action_executor
from admyral.context import ctx
from admyral.actions import wait


#########################################################################################################


@action(
    display_name="Action Test Missing Secret",
    display_namespace="Utils",
    secrets_placeholders=["DUMMY"],
)
def action_test_missing_secret() -> dict[str, str]:
    secret = ctx.get().secrets.get("DUMMY")
    return secret


@workflow
def workflow_test_missing_secret(payload: dict[str, JsonValue]):
    action_test_missing_secret(secrets={"DUMMY": "123"})


@pytest.mark.asyncio
async def test_missing_secret(store: AdmyralStore):
    workflow_id = workflow_test_missing_secret.func.__name__

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_id,
        workflow_actions=[
            action_executor(
                action_test_missing_secret.action_type, action_test_missing_secret.func
            )
        ],
        workflow_code=workflow_test_missing_secret,
    )

    assert exception is not None
    assert run.failed_at is not None
    assert run_steps[1].error == "Secret '123' not found."


#########################################################################################################


@action(
    display_name="Action Test Missing Env Variable",
    display_namespace="Utils",
)
def action_test_raise_error() -> dict[str, str]:
    raise Exception("This is an error.")


@workflow
def workflow_test_action_raises_error(payload: dict[str, JsonValue]):
    action_test_raise_error()


@pytest.mark.asyncio
async def test_action_raises_error(store: AdmyralStore):
    workflow_id = workflow_test_action_raises_error.func.__name__

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_id,
        workflow_actions=[
            action_executor(
                action_test_raise_error.action_type, action_test_raise_error.func
            )
        ],
        workflow_code=workflow_test_action_raises_error,
    )

    assert exception is not None
    assert run.failed_at is not None
    assert run_steps[1].error == "This is an error."


#########################################################################################################


@action(
    display_name="Action Test Missing Params",
    display_namespace="Utils",
)
def action_test_missing_params(
    num: Annotated[
        int,
        ArgumentMetadata(
            display_name="Number",
            description="The number to be used in the action.",
        ),
    ],
) -> None:
    if not isinstance(num, int):
        raise Exception("num is not an int.")


@workflow
def workflow_test_action_missing_params(payload: dict[str, JsonValue]):
    action_test_missing_params()


@pytest.mark.asyncio
async def test_action_missing_params(store: AdmyralStore):
    workflow_id = workflow_test_action_missing_params.func.__name__

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_id,
        workflow_actions=[
            action_executor(
                action_test_missing_params.action_type, action_test_missing_params.func
            )
        ],
        workflow_code=workflow_test_action_missing_params,
    )

    assert exception is not None
    assert run.failed_at is not None
    assert (
        run_steps[1].error
        == "action_test_missing_params() missing 1 required positional argument: 'num'"
    )


#########################################################################################################


@action(
    display_name="Action Test Missing Custom Action",
    display_namespace="Utils",
)
def action_test_missing_custom_action() -> str:
    return "Hello world"


@workflow
def workflow_test_action_missing_custom_action(payload: dict[str, JsonValue]):
    action_test_missing_custom_action()


@pytest.mark.asyncio
async def test_missing_custom_action(store: AdmyralStore):
    workflow_id = workflow_test_action_missing_custom_action.func.__name__

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_id,
        workflow_actions=[],
        custom_actions=[action_test_missing_custom_action.action_type],
        workflow_code=workflow_test_action_missing_custom_action,
    )

    assert exception is not None
    assert run.failed_at is not None
    assert (
        run_steps[1].error
        == "Action with type 'action_test_missing_custom_action' not found. Did you push your action?"
    )


#########################################################################################################


@workflow
def workflow_test_wait_action(payload: dict[str, JsonValue]):
    wait(seconds=10)


@pytest.mark.asyncio
async def test_wait_action(store: AdmyralStore):
    workflow_id = workflow_test_wait_action.func.__name__

    start = time.time()

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_id,
        workflow_actions=[action_executor(wait.action_type, wait.func)],
        workflow_code=workflow_test_wait_action,
    )

    end = time.time()

    assert exception is None
    assert run.failed_at is None
    assert end - start >= 10
