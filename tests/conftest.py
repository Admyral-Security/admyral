import pytest
import asyncio
from temporalio.worker import Worker
from temporalio.client import Client as TemporalClient
from concurrent.futures import ThreadPoolExecutor

from admyral.db.admyral_store import AdmyralStore
from admyral.config.config import TEST_USER_ID
from admyral.utils.future_executor import capture_main_event_loop
from admyral.workers.workflow_executor import WorkflowExecutor


TEMPORAL_HOST = "localhost:7233"
TEMPORAL_QUEUE_NAME = "test_queue"
THREAD_POOL_SIZE = 100


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def store(event_loop):
    store = await AdmyralStore.create_store()
    yield store
    await store.clean_up_workflow_data_of(TEST_USER_ID)


async def _setup_shared_worker_state_for_testing(store: AdmyralStore) -> None:
    from admyral.workers.shared_worker_state import SharedWorkerState
    from admyral.secret.secrets_manager import secrets_manager_factory
    from admyral.workers.python_executor import python_action_worker_setup

    secrets_manager = secrets_manager_factory(store)
    await SharedWorkerState.init(store, secrets_manager)

    await python_action_worker_setup()

    capture_main_event_loop()


def _get_activities():
    from admyral.workers.workflow_run_initializer import init_workflow_run
    from admyral.workers.workflow_run_completor import mark_workflow_as_completed
    from admyral.workers.if_condition_executor import execute_if_condition
    from admyral.workers.action_executor import action_executor
    from admyral.workers.store_error import (
        store_reference_resolution_error,
        mark_workflow_as_failed,
    )
    from admyral.workers.store_workflow_error import store_action_input_too_large_error
    from admyral.workers.loop_executor import init_loop_action, store_loop_action_result
    from admyral.workers.python_executor import execute_python_action
    from admyral.action_registry import ActionRegistry

    return [
        action_executor(action.action_type, action.func)
        for action in ActionRegistry.get_actions()
    ] + [
        action_executor("execute_python_action", execute_python_action),
        action_executor("if_condition", execute_if_condition),
        init_loop_action,
        store_loop_action_result,
        init_workflow_run,
        mark_workflow_as_completed,
        store_reference_resolution_error,
        store_action_input_too_large_error,
        mark_workflow_as_failed,
    ]


@pytest.fixture(scope="session", autouse=True)
async def temporal_client(store: AdmyralStore) -> TemporalClient:
    await _setup_shared_worker_state_for_testing(store)

    client = await TemporalClient.connect(TEMPORAL_HOST)

    activities = _get_activities()

    async with Worker(
        client=client,
        task_queue=TEMPORAL_QUEUE_NAME,
        workflows=[WorkflowExecutor],
        activities=activities,
        activity_executor=ThreadPoolExecutor(THREAD_POOL_SIZE),
        debug_mode=True,
    ):
        yield client
