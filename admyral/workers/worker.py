from temporalio.client import Client
from temporalio.worker import Worker
from concurrent.futures import ThreadPoolExecutor

from admyral.workers.workflow_executor import WorkflowExecutor
from admyral.workers.python_executor import (
    execute_python_action,
    python_action_worker_setup,
)
from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.action_registry import ActionRegistry
from admyral.db.admyral_store import AdmyralStore
from admyral.logger import get_logger
from admyral.workers.action_executor import action_executor
from admyral.workers.workflow_run_initializer import init_workflow_run
from admyral.workers.workflow_run_completor import mark_workflow_as_completed
from admyral.secret.secrets_manager import secrets_manager_factory
from admyral.workers.if_condition_executor import execute_if_condition
from admyral.utils.future_executor import capture_main_event_loop
from admyral.workers.store_reference_error import store_reference_resolution_error

logger = get_logger(__name__)


async def _setup():
    await python_action_worker_setup()

    admyral_store = await AdmyralStore.create_store(skip_setup=True)
    secrets_manager = secrets_manager_factory(admyral_store)
    SharedWorkerState.init(admyral_store, secrets_manager)

    capture_main_event_loop()


async def run_worker(
    worker_name: str,
    target_host: str,
    task_queue: str = "workflow-queue",
    thread_pool_size: int = 100,
    worker_debug_mode: bool = False,
) -> None:
    logger.info(f"Setting up worker {worker_name}...")
    await _setup()
    logger.info(f"Worker {worker_name} setup complete.")

    # we wrap the actions with anohter layer which automically persists the result
    activities = [
        action_executor(action.action_type, action.func)
        for action in ActionRegistry.get_actions()
    ] + [
        action_executor("execute_python_action", execute_python_action),
        action_executor("if_condition", execute_if_condition),
        init_workflow_run,
        mark_workflow_as_completed,
        store_reference_resolution_error,
    ]

    logger.info(f"Starting worker {worker_name}...")
    client = await Client.connect(target_host)
    worker = Worker(
        client=client,
        task_queue=task_queue,
        workflows=[WorkflowExecutor],
        activities=activities,
        activity_executor=ThreadPoolExecutor(thread_pool_size),
        debug_mode=worker_debug_mode,
    )
    await worker.run()
