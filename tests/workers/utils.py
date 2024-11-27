from temporalio.client import Client as TemporalClient
from temporalio.common import RetryPolicy
from uuid import uuid4

from admyral.workers.workflow_executor import WorkflowExecutor
from admyral.models import (
    Workflow as WorkflowModel,
    WorkflowRunMetadata,
    WorkflowRunStep,
    WorkflowDAG,
)
from admyral.db.admyral_store import AdmyralStore
from admyral.typings import JsonValue
from admyral.config.config import TEST_USER_ID

from tests.conftest import TEMPORAL_QUEUE_NAME


async def execute_test_workflow(
    *,
    store: AdmyralStore,
    temporal_client: TemporalClient,
    workflow_id: str,
    workflow_name: str,
    workflow_dag: WorkflowDAG,
    payload: dict[str, JsonValue] = {},
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
    workflow = WorkflowModel(
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        workflow_dag=workflow_dag,
        is_active=True,
    )
    await store.store_workflow(TEST_USER_ID, workflow)

    workflow = await store.get_workflow_by_id(TEST_USER_ID, workflow_id)
    assert workflow is not None

    exception = None
    workflow_run_id = None
    try:
        workflow_run_id = await temporal_client.execute_workflow(
            WorkflowExecutor.run,
            {
                "user_id": TEST_USER_ID,
                "workflow": workflow,
                "source_name": "test",
                "payload": payload,
                "trigger_default_args": {},
            },
            id=str(uuid4()),
            task_queue=TEMPORAL_QUEUE_NAME,
            # do not retry failed workflows
            retry_policy=RetryPolicy(
                maximum_attempts=1, non_retryable_error_types=["Exception"]
            ),
        )
    except Exception as e:
        exception = e

    if workflow_run_id is None:
        return None, None, exception

    run = await store.get_workflow_run(TEST_USER_ID, workflow_id, workflow_run_id)
    assert run is not None

    run_steps_metadata = await store.list_workflow_run_steps(
        TEST_USER_ID, workflow_id, workflow_run_id
    )
    run_steps = []
    for run_step_metadata in run_steps_metadata:
        step_id = run_step_metadata.step_id
        run_step = await store.get_workflow_run_step(
            TEST_USER_ID, workflow_id, workflow_run_id, step_id
        )
        run_steps.append(run_step)

    return run, run_steps, exception
