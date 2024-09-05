from temporalio import activity
import time


from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.logger import get_logger
from admyral.utils.time import utc_now


logger = get_logger(__name__)


@activity.defn
async def mark_workflow_as_completed(
    run_id: str,
) -> str:
    start = time.monotonic_ns()
    await SharedWorkerState.get_store().mark_workflow_run_as_completed(
        run_id=run_id,
        completed_at=utc_now(),
    )
    end = time.monotonic_ns()
    logger.info(
        f"Marked workflow run {run_id} as completed in {(end - start) / 1_000_000}ms"
    )
