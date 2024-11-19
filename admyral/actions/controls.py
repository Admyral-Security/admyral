from admyral.action import action
from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.utils.future_executor import execute_future
from admyral.context import ctx


@action(
    display_name="Pass Control",
    display_namespace="Controls",
    description="Mark control as passed",
)
def pass_control() -> None:
    exec_ctx = ctx.get()
    execute_future(
        SharedWorkerState.get_store().store_workflow_control_result(
            workflow_id=exec_ctx.workflow_id, run_id=exec_ctx.run_id, result=True
        )
    )


@action(
    display_name="Fail Control",
    display_namespace="Controls",
    description="Mark control as failed",
)
def fail_control() -> None:
    exec_ctx = ctx.get()
    execute_future(
        SharedWorkerState.get_store().store_workflow_control_result(
            workflow_id=exec_ctx.workflow_id, run_id=exec_ctx.run_id, result=False
        )
    )
