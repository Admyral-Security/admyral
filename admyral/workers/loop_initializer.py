from temporalio import activity
from uuid import uuid4

from admyral.typings import JsonValue
from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.logger import get_logger
from admyral.models import LoopType


logger = get_logger(__name__)


@activity.defn
async def init_loop_action(
    run_id: str,
    prev_step_id: str,
    loop_name: str,
    loop_condition: JsonValue,
    loop_type: LoopType,
) -> str:
    step_id = str(uuid4())
    await SharedWorkerState.get_store().store_action_result(
        step_id,
        run_id,
        "loop",
        prev_step_id,
        {},
        {
            "loop_name": loop_name,
            "loop_condition": loop_condition,
            "loop_type": loop_type,
        },
    )
