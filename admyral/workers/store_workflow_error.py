from temporalio import activity
from uuid import uuid4

from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.logger import get_logger


logger = get_logger(__name__)


@activity.defn
async def store_action_input_too_large_error(
    run_id: str,
    action_type: str,
    prev_step_id: str,
) -> str:
    step_id = str(uuid4())
    await SharedWorkerState.get_store().store_workflow_run_error(
        step_id,
        run_id,
        action_type,
        prev_step_id,
        "Input payload is too large. Exceeds 2 MB limit.",
        {},
    )
