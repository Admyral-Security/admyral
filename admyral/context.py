from typing import Optional
import contextvars

from admyral.workers.shared_worker_state import SharedWorkerState
from admyral.utils.future_executor import execute_future
from admyral.secret.secrets_access import Secrets
from admyral.config.config import CONFIG


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


ctx = contextvars.ContextVar(
    "execution_context", default=ExecutionContext.placeholder()
)
