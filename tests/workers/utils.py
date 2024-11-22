from temporalio.worker import Worker
from temporalio.client import Client as TemporalClient
from temporalio.common import RetryPolicy
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from admyral.workers.workflow_executor import WorkflowExecutor
from admyral.models import (
    Workflow as WorkflowModel,
    WorkflowRunMetadata,
    WorkflowRunStep,
    WorkflowDAG,
)
from admyral.db.admyral_store import AdmyralStore
from admyral.secret.secrets_manager import secrets_manager_factory
from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.utils.future_executor import capture_main_event_loop
from admyral.typings import JsonValue
from admyral.workers.workflow_run_initializer import init_workflow_run
from admyral.workers.workflow_run_completor import mark_workflow_as_completed
from admyral.workers.python_executor import execute_python_action
from admyral.workers.if_condition_executor import execute_if_condition
from admyral.workers.action_executor import action_executor
from admyral.workers.store_reference_error import store_reference_resolution_error
from admyral.action_registry import ActionRegistry
from admyral.action import Action
from admyral.config.config import TEST_USER_ID


async def _setup_shared_worker_state_for_testing(store: AdmyralStore) -> AdmyralStore:
    secrets_manager = secrets_manager_factory(store)
    await SharedWorkerState.init(store, secrets_manager)

    capture_main_event_loop()


async def execute_test_workflow(
    *,
    store: AdmyralStore,
    workflow_id: str,
    workflow_name: str,
    workflow_actions: list[Action],
    workflow_dag: WorkflowDAG,
    custom_actions: list[str] = [],
    payload: dict[str, JsonValue] = {},
    thread_pool_size: int = 100,
    worker_debug_mode: bool = False,
    temporal_host: str = "localhost:7233",
) -> tuple[WorkflowRunMetadata, list[WorkflowRunStep], Exception | None]:
    """
    Executes a test workflow with the given actions and workflow code.

    NOTE: Requires temporal to be running

    Args:
        workflow_id (str): The workflow id
        workflow_name (str): The workflow name
        workflow_actions (list): The list of actions to be executed. Must be wrapped in action_executor!
                                 init_workflow_run and mark_workflow_as_completed are automatically added.
        workflow_code (Workflow): The workflow code
        custom_actions (list[str], optional): The list of custom actions used in the workflow. Defaults to [].
        payload (dict[str, JsonValue], optional): The payload to be passed to the workflow. Defaults to {}.
        thread_pool_size (int, optional): The thread pool size. Defaults to 100.
        worker_debug_mode (bool, optional): The worker debug mode. Defaults to False.
        temporal_host (str, optional): The temporal host. Defaults to "localhost:7233".

    Returns:
        tuple[WorkflowRunMetadata, list[WorkflowRunStep]]: The workflow run metadata and the workflow run steps
    """
    await _setup_shared_worker_state_for_testing(store)

    workflow = WorkflowModel(
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=workflow_dag,
        is_active=True,
    )
    await store.store_workflow(TEST_USER_ID, workflow)

    task_queue_name = "test_queue"

    client = await TemporalClient.connect(temporal_host)

    workflow_actions += [
        action_executor("execute_python_action", execute_python_action),
        action_executor("if_condition", execute_if_condition),
        init_workflow_run,
        mark_workflow_as_completed,
        store_reference_resolution_error,
    ]

    # remove custom actions from the registry because
    # they must be present in the store instead.
    for custom_action in custom_actions:
        ActionRegistry.deregister(custom_action)

    exception = None
    try:
        async with Worker(
            client=client,
            task_queue=task_queue_name,
            workflows=[WorkflowExecutor],
            activities=workflow_actions,
            activity_executor=ThreadPoolExecutor(thread_pool_size),
            debug_mode=worker_debug_mode,
        ):
            await client.execute_workflow(
                WorkflowExecutor.run,
                {
                    "user_id": TEST_USER_ID,
                    "workflow": workflow,
                    "source_name": "test",
                    "payload": payload,
                    "trigger_default_args": {},
                },
                id=str(uuid4()),
                task_queue=task_queue_name,
                # do not retry failed workflows
                retry_policy=RetryPolicy(
                    maximum_attempts=1, non_retryable_error_types=["Exception"]
                ),
            )
    except Exception as e:
        exception = e

    runs = await store.list_workflow_runs(TEST_USER_ID, workflow_id)
    assert len(runs) == 1

    run = runs[0]

    run_steps_metadata = await store.list_workflow_run_steps(
        TEST_USER_ID, workflow_id, run.run_id
    )
    run_steps = []
    for run_step_metadata in run_steps_metadata:
        step_id = run_step_metadata.step_id
        run_step = await store.get_workflow_run_step(
            TEST_USER_ID, workflow_id, run.run_id, step_id
        )
        run_steps.append(run_step)

    return run, run_steps, exception
