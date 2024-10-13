from typing import Optional
import contextvars

from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.utils.future_executor import execute_future
from admyral.secret.secrets_access import Secrets
from admyral.config.config import CONFIG
from admyral.exceptions import NonRetryableActionError


class ExecutionContext:
    def __init__(
        self,
        workflow_id: str,
        run_id: str,
        action_type: str,
        user_id: str,
        step_id: Optional[str] = None,
        prev_step_id: Optional[str] = None,
        secrets: Secrets = Secrets.default(),
        _is_placeholder: bool = False,
    ) -> None:
        self.workflow_id = workflow_id
        self.run_id = run_id
        self.action_type = action_type
        self.step_id = step_id or ""
        self.prev_step_id = prev_step_id or ""
        self.user_id = user_id
        self.secrets = secrets
        self._is_placeholder = _is_placeholder

    @classmethod
    def placeholder(cls) -> "ExecutionContext":
        return ExecutionContext(
            workflow_id="", run_id="", action_type="", user_id=CONFIG.default_user_id
        )

    async def append_logs_async(self, lines: list[str]) -> None:
        if not self._is_placeholder:
            await SharedWorkerState.get_store().append_logs(
                self.step_id, self.run_id, self.action_type, self.prev_step_id, lines
            )

    def append_logs_sync(self, lines: list[str]) -> None:
        if not self._is_placeholder:
            execute_future(self.append_logs_async(lines))

    async def send_to_workflow_async(
        self, workflow_name: str, data: dict[str, str]
    ) -> None:
        if self._is_placeholder:
            return

        workflow = await SharedWorkerState.get_store().get_workflow_by_name(
            self.user_id, workflow_name
        )
        if not workflow:
            raise NonRetryableActionError(
                f'Failed to send to workflow "{workflow_name}". Workflow not found.'
            )

        await SharedWorkerState.get_workers_client().start_workflow(
            self.user_id, workflow, self.action_type, payload=data
        )

    def send_to_workflow_sync(self, workflow_name: str, data: dict[str, str]) -> None:
        if not self._is_placeholder:
            execute_future(self.send_to_workflow_async(workflow_name, data))


ctx = contextvars.ContextVar(
    "execution_context", default=ExecutionContext.placeholder()
)
