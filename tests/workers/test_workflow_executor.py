import pytest
from typing import Annotated
import time
from uuid import uuid4

from tests.workers.utils import execute_test_workflow

from admyral.db.admyral_store import AdmyralStore
from admyral.action import action, ArgumentMetadata
from admyral.workers.action_executor import action_executor
from admyral.context import ctx
from admyral.actions import wait
from admyral.models import WorkflowStart, WorkflowDAG, ActionNode


#########################################################################################################


@action(
    display_name="Action Test Missing Secret",
    display_namespace="Utils",
    secrets_placeholders=["DUMMY"],
)
def action_test_missing_secret() -> dict[str, str]:
    secret = ctx.get().secrets.get("DUMMY")
    return secret


WORKFLOW_MISSING_SECRET = WorkflowDAG(
    name="workflow_test_missing_secret",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["action_test_missing_secret"],
        ),
        "action_test_missing_secret": ActionNode(
            id="action_test_missing_secret",
            type="action_test_missing_secret",
            secrets_mapping={"DUMMY": "123"},
        ),
    },
)


@pytest.mark.asyncio
async def test_missing_secret(store: AdmyralStore):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_MISSING_SECRET.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_actions=[
            action_executor(
                action_test_missing_secret.action_type, action_test_missing_secret.func
            )
        ],
        workflow_dag=WORKFLOW_MISSING_SECRET,
    )

    assert exception is None
    assert run.failed_at is not None
    assert run_steps[1].error == "Secret '123' not found."


#########################################################################################################


@action(
    display_name="Action Test Missing Env Variable",
    display_namespace="Utils",
)
def action_test_raise_error() -> dict[str, str]:
    raise Exception("This is an error.")


WORKFLOW_TEST_ACTION_RAISES_ERROR = WorkflowDAG(
    name="workflow_test_action_raises_error",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["action_test_raise_error"],
        ),
        "action_test_raise_error": ActionNode(
            id="action_test_raise_error",
            type="action_test_raise_error",
        ),
    },
)


@pytest.mark.asyncio
async def test_action_raises_error(store: AdmyralStore):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_ACTION_RAISES_ERROR.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_actions=[
            action_executor(
                action_test_raise_error.action_type, action_test_raise_error.func
            )
        ],
        workflow_dag=WORKFLOW_TEST_ACTION_RAISES_ERROR,
    )

    assert exception is None
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


WORKFLOW_TEST_ACTION_MISSING_PARAMS = WorkflowDAG(
    name="workflow_test_action_missing_params",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["action_test_missing_params"],
        ),
        "action_test_missing_params": ActionNode(
            id="action_test_missing_params",
            type="action_test_missing_params",
        ),
    },
)


@pytest.mark.asyncio
async def test_action_missing_params(store: AdmyralStore):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_ACTION_MISSING_PARAMS.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_actions=[
            action_executor(
                action_test_missing_params.action_type, action_test_missing_params.func
            )
        ],
        workflow_dag=WORKFLOW_TEST_ACTION_MISSING_PARAMS,
    )

    assert exception is None
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


WORKFLOW_TEST_ACTION_MISSING_CUSTOM_ACTION = WorkflowDAG(
    name="workflow_test_action_missing_custom_action",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["action_test_missing_custom_action"],
        ),
        "action_test_missing_custom_action": ActionNode(
            id="action_test_missing_custom_action",
            type="action_test_missing_custom_action",
        ),
    },
)


@pytest.mark.asyncio
async def test_missing_custom_action(store: AdmyralStore):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_ACTION_MISSING_CUSTOM_ACTION.name + workflow_id

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_actions=[],
        custom_actions=[action_test_missing_custom_action.action_type],
        workflow_dag=WORKFLOW_TEST_ACTION_MISSING_CUSTOM_ACTION,
    )

    assert exception is None
    assert run.failed_at is not None
    assert (
        run_steps[1].error
        == "Action with type 'action_test_missing_custom_action' not found. Did you push your action?"
    )


#########################################################################################################


WORKFLOW_TEST_WAIT_ACTION = WorkflowDAG(
    name="workflow_test_wait_action",
    start=WorkflowStart(triggers=[]),
    dag={
        "start": ActionNode(
            id="start",
            type="start",
            children=["wait"],
        ),
        "wait": ActionNode(
            id="wait",
            type="wait",
            args={"seconds": 3},
        ),
    },
)


@pytest.mark.asyncio
async def test_wait_action(store: AdmyralStore):
    workflow_id = str(uuid4())
    workflow_name = WORKFLOW_TEST_WAIT_ACTION.name + workflow_id

    start = time.time()

    run, run_steps, exception = await execute_test_workflow(
        store=store,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_actions=[action_executor(wait.action_type, wait.func)],
        workflow_dag=WORKFLOW_TEST_WAIT_ACTION,
    )

    end = time.time()

    assert exception is None
    assert run.failed_at is None
    assert end - start >= 3
