from temporalio.client import (
    Client,
    Schedule,
    ScheduleActionStartWorkflow,
    ScheduleSpec,
    ScheduleIntervalSpec,
)
from uuid import uuid4
from datetime import timedelta
import temporalio

from admyral.logger import get_logger
from admyral.workers.workflow_executor import WorkflowExecutor
from admyral.db.store_interface import StoreInterface
from admyral.models import WorkflowSchedule, Workflow
from admyral.typings import JsonValue


logger = get_logger(__name__)


class WorkersClient:
    def __init__(self, store: StoreInterface, client: Client) -> None:
        self.client = client
        self.store = store

    @classmethod
    async def connect(cls, store: StoreInterface, host: str) -> "WorkersClient":
        logger.info(f"Connecting to Temporal at host {host}...")
        client = await Client.connect(host)
        return cls(store, client)

    async def execute_workflow(
        self,
        workflow_id: str,
        source_name: str,
        payload: dict[str, JsonValue] = {},
        trigger_default_args: dict[str, JsonValue] = {},
    ) -> None:
        logger.info(f"Executing workflow {workflow_id} from source {source_name}.")

        workflow = await self.store.get_workflow_by_id(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow with id {workflow_id} not found.")

        # TODO: should we unify the temporal_workflow_id across triggers?
        temmporal_workflow_id = str(uuid4())
        await self.client.execute_workflow(
            WorkflowExecutor.run,
            {
                "workflow": workflow,
                "source_name": source_name,
                "payload": payload,
                "trigger_default_args": trigger_default_args,
            },
            id=temmporal_workflow_id,
            task_queue="workflow-queue",
        )

    def _build_temporal_schedule_spec(self, schedule: WorkflowSchedule) -> ScheduleSpec:
        if schedule.cron:
            return ScheduleSpec(cron_expressions=[schedule.cron])

        interval = None
        if schedule.interval_seconds:
            interval = timedelta(seconds=schedule.interval_seconds)
        elif schedule.interval_minutes:
            interval = timedelta(minutes=schedule.interval_minutes)
        elif schedule.interval_hours:
            interval = timedelta(hours=schedule.interval_hours)
        elif schedule.interval_days:
            interval = timedelta(hours=schedule.interval_days * 24)
        else:
            raise ValueError(
                "Invalid schedule trigger config. Neither an interval nor a cron expression was provided."
            )

        return ScheduleSpec(intervals=[ScheduleIntervalSpec(every=interval)])

    async def schedule_workflow(
        self, workflow: Workflow, schedule: WorkflowSchedule
    ) -> None:
        # TODO: should we unify the temporal_workflow_id across triggers?
        temmporal_workflow_id = str(uuid4())
        await self.client.create_schedule(
            schedule.schedule_id,
            Schedule(
                action=ScheduleActionStartWorkflow(
                    WorkflowExecutor.run,
                    {
                        "workflow": workflow,
                        "source_name": "schedule",
                        "payload": {},
                        "trigger_default_args": schedule.default_args,
                    },
                    id=temmporal_workflow_id,
                    task_queue="workflow-queue",
                ),
                spec=self._build_temporal_schedule_spec(schedule),
            ),
        )

    async def delete_schedule(self, schedule_id: str) -> None:
        try:
            schedule_handle = self.client.get_schedule_handle(schedule_id)
            await schedule_handle.delete()
        except temporalio.service.RPCError as e:
            logger.error(f"Schedule ID {schedule_id} does not exist. Error: {e}")
