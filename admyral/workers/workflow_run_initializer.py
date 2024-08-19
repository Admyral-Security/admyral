from typing import Any
from temporalio import activity
from uuid import uuid4
import time

from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.logger import get_logger


logger = get_logger(__name__)


@activity.defn
async def init_workflow_run(
    workflow_id: str,
    source_name: str,
    payload: dict[str, Any],
) -> str:
    start = time.monotonic_ns()
    run_id = str(uuid4())
    step_id = str(uuid4())
    await SharedWorkerState.get_store().init_workflow_run(
        run_id,
        step_id,
        workflow_id,
        source_name,
        payload,
    )
    end = time.monotonic_ns()
    logger.info(f"Initialized workflow run {run_id} in {(end - start) / 1_000_000}ms")
    return run_id
