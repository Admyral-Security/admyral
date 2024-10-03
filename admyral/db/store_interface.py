from abc import ABC, abstractmethod
from typing import Optional

from admyral.models import (
    User,
    PipLockfile,
    PythonAction,
    ActionMetadata,
    Workflow,
    WorkflowRun,
    WorkflowWebhook,
    WorkflowSchedule,
    EncryptedSecret,
    WorkflowMetadata,
    SecretMetadata,
    WorkflowRunMetadata,
    WorkflowRunStepMetadata,
    WorkflowRunStep,
    ApiKey,
)
from admyral.typings import JsonValue


class StoreInterface(ABC):
    ########################################################
    # User Management
    ########################################################

    @abstractmethod
    async def get_user(self, user_id: str) -> User | None: ...

    @abstractmethod
    async def clean_up_workflow_data_of(self, user_id: str) -> None: ...

    ########################################################
    # API Key Management
    ########################################################

    @abstractmethod
    async def store_api_key(self, user_id: str, name: str, key: str) -> ApiKey: ...

    @abstractmethod
    async def list_api_keys(self, user_id: str) -> list[ApiKey]: ...

    @abstractmethod
    async def search_api_key_owner(self, key: str) -> Optional[str]: ...

    @abstractmethod
    async def delete_api_key(self, user_id: str, key_id: str) -> None: ...

    ########################################################
    # Python Action
    ########################################################

    @abstractmethod
    async def list_actions(self, user_id: str) -> list[ActionMetadata]: ...

    @abstractmethod
    async def get_action(
        self, user_id: str, action_type: str
    ) -> Optional[PythonAction]: ...

    @abstractmethod
    async def store_action(self, user_id: str, action: PythonAction) -> None: ...

    @abstractmethod
    async def delete_action(self, user_id: str, action_type: str) -> None: ...

    ########################################################
    # Pip Lockfile Cache
    ########################################################

    @abstractmethod
    async def get_cached_pip_lockfile(self, hash: str) -> Optional[PipLockfile]: ...

    @abstractmethod
    async def cache_pip_lockfile(self, pip_lockfile: PipLockfile) -> None: ...

    @abstractmethod
    async def delete_expired_cached_pip_lockfile(self) -> None: ...

    ########################################################
    # Workflows
    ########################################################

    @abstractmethod
    async def list_workflows(self, user_id: str) -> list[WorkflowMetadata]: ...

    @abstractmethod
    async def get_workflow_by_name(
        self, user_id: str, workflow_name: str
    ) -> Optional[Workflow]: ...

    @abstractmethod
    async def get_workflow_by_id(
        self, user_id: str, workflow_id: str
    ) -> Optional[Workflow]: ...

    @abstractmethod
    async def store_workflow(self, user_id: str, workflow: Workflow) -> None: ...

    @abstractmethod
    async def set_workflow_active_state(
        self, user_id: str, workflow_id: str, is_active: bool
    ) -> None: ...

    @abstractmethod
    async def remove_workflow(self, user_id: str, workflow_id: str) -> None: ...

    @abstractmethod
    async def get_workflow_for_webhook(
        self, workflow_id: str
    ) -> Optional[tuple[str, Workflow]]: ...

    ########################################################
    # Workflow Webhooks
    ########################################################

    @abstractmethod
    async def store_workflow_webhook(
        self, user_id: str, workflow_id: str
    ) -> WorkflowWebhook: ...

    @abstractmethod
    async def get_webhook_for_workflow(
        self, user_id: str, workflow_id: str
    ) -> Optional[WorkflowWebhook]: ...

    @abstractmethod
    async def get_webhook(self, webhook_id: str) -> Optional[WorkflowWebhook]: ...

    @abstractmethod
    async def delete_webhook(self, user_id: str, webhook_id: str) -> None: ...

    ########################################################
    # Workflow Schedules
    ########################################################

    @abstractmethod
    async def store_schedule(
        self, user_id: str, schedule: WorkflowSchedule
    ) -> None: ...

    @abstractmethod
    async def list_schedules_for_workflow(
        self, user_id: str, workflow_id: str
    ) -> list[WorkflowSchedule]: ...

    @abstractmethod
    async def delete_schedule(self, user_id: str, schedule_id: str) -> None: ...

    ########################################################
    # Workflow Runs - User Facing
    ########################################################

    @abstractmethod
    async def list_workflow_runs(
        self, user_id: str, workflow_id: str, limit: int = 100
    ) -> list[WorkflowRunMetadata]: ...

    @abstractmethod
    async def get_workflow_run(
        self, workflow_id: str, run_id: str
    ) -> Optional[WorkflowRun]: ...

    @abstractmethod
    async def list_workflow_run_steps(
        self, user_id: str, workflow_id: str, run_id: str
    ) -> list[WorkflowRunStepMetadata]: ...

    @abstractmethod
    async def get_workflow_run_step(
        self, user_id: str, workflow_id: str, run_id: str, step_id: str
    ) -> Optional[WorkflowRunStep]: ...

    ########################################################
    # Workflow Runs - State Updates during execution
    ########################################################

    @abstractmethod
    async def init_workflow_run(
        self,
        run_id: str,
        step_id: str,
        workflow_id: str,
        source_name: str,
        payload: dict[str, JsonValue],
    ) -> None: ...

    @abstractmethod
    async def mark_workflow_run_as_completed(
        self, run_id: str, completed_at: str
    ) -> None: ...

    @abstractmethod
    async def append_logs(
        self, step_id: str, run_id: str, action_id: str, prev_step_id: str, logs: str
    ) -> None: ...

    @abstractmethod
    async def store_action_result(
        self,
        step_id: str,
        run_id: str,
        action_type: str,
        prev_step_id: str,
        result: JsonValue,
        input_args: dict[str, JsonValue],
    ) -> None: ...

    @abstractmethod
    async def store_workflow_run_error(
        self,
        step_id: str,
        run_id: str,
        action_type: str,
        prev_step_id: str,
        error: str,
        input_args: dict[str, JsonValue],
    ) -> None: ...

    ########################################################
    # Secrets
    ########################################################

    @abstractmethod
    async def list_secrets(
        self, user_id: str, secret_type: Optional[str] = None
    ) -> list[SecretMetadata]: ...

    @abstractmethod
    async def get_secret(
        self, user_id: str, secret_id: str
    ) -> Optional[EncryptedSecret]: ...

    @abstractmethod
    async def store_secret(
        self, user_id: str, secret_id: str, encrypted_secret: Optional[str]
    ) -> None: ...

    @abstractmethod
    async def delete_secret(self, user_id: str, secret_id: str) -> None: ...
