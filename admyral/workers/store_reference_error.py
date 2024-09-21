from temporalio import activity
from uuid import uuid4
import time

from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.logger import get_logger


logger = get_logger(__name__)


@activity.defn
async def store_reference_resolution_error(
    run_id: str,
    prev_step_id: str,
    action_type: str,
    error: str,
) -> str:
    start = time.monotonic_ns()
    step_id = str(uuid4())
    await SharedWorkerState.get_store().store_workflow_run_error(
        step_id,
        run_id,
        action_type,
        prev_step_id,
        error,
        input_args={},
    )
    end = time.monotonic_ns()
    logger.info(f"Stored reference resolution error in {(end - start) / 1_000_000}ms")
