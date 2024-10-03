from typing import Optional, Any, AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, delete, insert, update
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager
from uuid import uuid4
import json

from admyral.models import (
    User,
    PipLockfile,
    PythonAction,
    Workflow,
    WorkflowRun,
    WorkflowWebhook,
    EncryptedSecret,
    WorkflowMetadata,
    ActionMetadata,
    SecretMetadata,
    WorkflowRunMetadata,
    WorkflowRunStepMetadata,
    WorkflowRunStep,
    ApiKey,
)
from admyral.models.workflow_schedule import WorkflowSchedule
from admyral.db.store_interface import StoreInterface
from admyral.db.schemas import (
    PythonActionSchema,
    PipLockfileCacheSchema,
    WorkflowSchema,
    WorkflowRunSchema,
    WorkflowRunStepsSchema,
    WorkflowWebhookSchema,
    WorkflowScheduleSchema,
    SecretsSchema,
    UserSchema,
    ApiKeySchema,
)
from admyral.db.alembic.database_manager import DatabaseManager
from admyral.config.config import GlobalConfig, CONFIG
from admyral.logger import get_logger
from admyral.utils.time import utc_now
from admyral.utils.crypto import generate_hs256
from admyral.typings import JsonValue


logger = get_logger(__name__)


class AdmyralDatabaseSession:
    def __init__(self, session: AsyncSession, execution_options: dict = {}) -> None:
        self.session = session
        self.execution_options = execution_options

    @classmethod
    async def from_session(
        cls,
        session: AsyncSession,
        execution_options: dict = {},
    ) -> "AdmyralDatabaseSession":
        return cls(session, execution_options)

    async def exec(self, statement: Any) -> Any:
        return await self.session.exec(
            statement, execution_options=self.execution_options
        )

    async def commit(self) -> None:
        await self.session.commit()


class AdmyralStore(StoreInterface):
    def __init__(self, config: GlobalConfig) -> None:
        self.config = config

        self.engine = create_async_engine(
            self.config.database_url, echo=True, future=True, pool_pre_ping=True
        )
        self.async_session_maker = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

        self.execution_options = {}

        self.performed_setup = False

    # TODO: pass down config
    @classmethod
    async def create_store(cls, skip_setup: bool = False) -> "AdmyralStore":
        store = cls(CONFIG)
        if not skip_setup:
            await store.setup()
        store.performed_setup = True

        return store

    ########################################################
    # Setup & Chore
    ########################################################

    async def setup(self):
        logger.info("Setting up Admyral store.")

        database_manager = DatabaseManager(self.engine, self.config)

        does_db_exist = await database_manager.database_exists()
        if not does_db_exist:
            logger.info("Creating database...")
            await database_manager.create_database()
            logger.info("Database created.")

        logger.info("Running migrations...")
        await database_manager.migrate_database()
        logger.info("Migrations complete.")

        logger.info("Setting up Admyral store complete.")

    ########################################################
    # Helpers
    ########################################################

    @asynccontextmanager
    async def _get_async_session(self) -> AsyncGenerator[AdmyralDatabaseSession, None]:
        assert self.performed_setup, "Store has not been set up yet."
        async with self.async_session_maker() as session:
            db = await AdmyralDatabaseSession.from_session(
                session,
                self.execution_options,
            )
            yield db

    ########################################################
    # User Management
    ########################################################

    async def get_user(self, user_id: str) -> User | None:
        async with self._get_async_session() as db:
            result = await db.exec(select(UserSchema).where(UserSchema.id == user_id))
            return result.one_or_none()

    async def clean_up_workflow_data_of(self, user_id: str) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                delete(WorkflowSchema).where(WorkflowSchema.user_id == user_id)
            )
            await db.commit()

    ########################################################
    # API Key Management
    ########################################################

    async def store_api_key(self, user_id: str, name: str, key: str) -> ApiKey:
        async with self._get_async_session() as db:
            api_key = ApiKey(
                id=str(uuid4()),
                name=name,
                user_id=user_id,
            )
            await db.exec(
                insert(ApiKeySchema).values(
                    id=api_key.id,
                    user_id=user_id,
                    name=name,
                    key=key,
                )
            )
            await db.commit()

        return api_key

    async def list_api_keys(self, user_id: str) -> list[ApiKey]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(ApiKeySchema).where(ApiKeySchema.user_id == user_id)
            )
            return [api_key.to_model() for api_key in result.all()]

    async def search_api_key_owner(self, key: str) -> Optional[str]:
        async with self._get_async_session() as db:
            result = await db.exec(select(ApiKeySchema).where(ApiKeySchema.key == key))
            api_key = result.one_or_none()
            return api_key.user_id if api_key else None

    async def delete_api_key(self, user_id: str, key_id: str) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                delete(ApiKeySchema)
                .where(ApiKeySchema.user_id == user_id)
                .where(ApiKeySchema.id == key_id)
            )
            await db.commit()

    ########################################################
    # Python Action
    ########################################################

    async def list_actions(self, user_id: str) -> list[ActionMetadata]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(PythonActionSchema).where(PythonActionSchema.user_id == user_id)
            )
            return [action.to_metadata() for action in result.all()]

    async def _get_action(
        self, db: AdmyralDatabaseSession, user_id: str, action_type: str
    ) -> Optional[PythonActionSchema]:
        result = await db.exec(
            select(PythonActionSchema)
            .where(PythonActionSchema.action_type == action_type)
            .where(PythonActionSchema.user_id == user_id),
        )
        return result.one_or_none()

    async def get_action(
        self, user_id: str, action_type: str
    ) -> Optional[PythonAction]:
        async with self._get_async_session() as db:
            action = await self._get_action(db, user_id, action_type)
            return action.to_model() if action is not None else None

    async def store_action(self, user_id: str, action: PythonAction) -> None:
        async with self._get_async_session() as db:
            # if the action type already exists, we update the code and requirements.
            python_action_entry = await self._get_action(
                db, user_id, action.action_type
            )

            secrets_placeholders = (
                ";".join(action.secrets_placeholders)
                if action.secrets_placeholders
                else None
            )
            requirements = (
                ";".join(action.requirements) if action.requirements else None
            )

            if python_action_entry:
                await db.exec(
                    update(PythonActionSchema)
                    .where(PythonActionSchema.action_type == action.action_type)
                    .where(PythonActionSchema.user_id == user_id)
                    .values(
                        import_statements=action.import_statements,
                        code=action.code,
                        display_name=action.display_name,
                        display_namespace=action.display_namespace,
                        description=action.description,
                        secrets_placeholders=secrets_placeholders,
                        requirements=requirements,
                        arguments=[arg.model_dump() for arg in action.arguments],
                        updated_at=utc_now(),
                    )
                )
            else:
                await db.exec(
                    insert(PythonActionSchema).values(
                        user_id=user_id,
                        action_type=action.action_type,
                        import_statements=action.import_statements,
                        code=action.code,
                        display_name=action.display_name,
                        display_namespace=action.display_namespace,
                        description=action.description,
                        secrets_placeholders=secrets_placeholders,
                        requirements=requirements,
                        arguments=[arg.model_dump() for arg in action.arguments],
                    )
                )

            await db.commit()

    async def delete_action(self, user_id: str, action_type: str) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                delete(PythonActionSchema)
                .where(PythonActionSchema.action_type == action_type)
                .where(PythonActionSchema.user_id == user_id)
            )
            await db.commit()

    ########################################################
    # Pip Lockfile Cache
    ########################################################

    async def _get_cached_pip_lockfile(
        self, db: AdmyralDatabaseSession, hash: str
    ) -> Optional[PipLockfileCacheSchema]:
        result = await db.exec(
            select(PipLockfileCacheSchema).where(PipLockfileCacheSchema.hash == hash)
        )
        return result.one_or_none()

    async def get_cached_pip_lockfile(self, hash: str) -> Optional[PipLockfile]:
        async with self._get_async_session() as db:
            pip_lockfile = await self._get_cached_pip_lockfile(db, hash)
            return pip_lockfile.to_model() if pip_lockfile else None

    async def cache_pip_lockfile(
        self,
        pip_lockfile: PipLockfile,
    ) -> None:
        try:
            async with self._get_async_session() as db:
                # check whether the lockfile is already cached. if yes, then we update
                # its expiration time. otherwise, we create a new cache entry.
                cached_pip_lockfile = await self._get_cached_pip_lockfile(
                    db, pip_lockfile.hash
                )

                if cached_pip_lockfile:
                    await db.exec(
                        update(PipLockfileCacheSchema)
                        .where(PipLockfileCacheSchema.hash == pip_lockfile.hash)
                        .values(
                            expiration_time=datetime.fromtimestamp(
                                pip_lockfile.expiration_time
                            ),
                            updated_at=utc_now(),
                        )
                    )
                else:
                    await db.exec(
                        insert(PipLockfileCacheSchema).values(
                            hash=pip_lockfile.hash,
                            lockfile=pip_lockfile.lockfile,
                            expiration_time=datetime.fromtimestamp(
                                pip_lockfile.expiration_time
                            ),
                        )
                    )

                await db.commit()
        except IntegrityError:
            # In case of a race condition, we might receive a unique constraint violation.
            # We can safely ignore this error.
            logger.warning(
                f"Non-critical race condition detected during caching lockfile with hash {pip_lockfile.hash}. Ignoring."
            )

    async def delete_expired_cached_pip_lockfile(self) -> None:
        async with self._get_async_session() as db:
            current_time = utc_now()
            await db.exec(
                delete(PipLockfileCacheSchema).where(
                    PipLockfileCacheSchema.expiration_time < current_time
                )
            )
            await db.commit()

    ########################################################
    # Workflows
    ########################################################

    async def list_workflows(self, user_id: str) -> list[WorkflowMetadata]:
        async with self._get_async_session() as db:
            # TODO: loading all workflows just for the metadata
            # is not very efficient
            result = await db.exec(
                select(WorkflowSchema).where(WorkflowSchema.user_id == user_id)
            )
            return [workflow.to_metadata() for workflow in result.all()]

    async def _get_workflow_by_name(
        self, db: AdmyralDatabaseSession, user_id: str, workflow_name: str
    ) -> Optional[WorkflowSchema]:
        result = await db.exec(
            select(WorkflowSchema)
            .where(WorkflowSchema.workflow_name == workflow_name)
            .where(WorkflowSchema.user_id == user_id)
        )
        return result.one_or_none()

    async def get_workflow_by_name(
        self, user_id: str, workflow_name: str
    ) -> Optional[Workflow]:
        async with self._get_async_session() as db:
            wf = await self._get_workflow_by_name(db, user_id, workflow_name)
            return wf.to_model() if wf else None

    async def _get_workflow_by_id(
        self, db: AdmyralDatabaseSession, user_id: str, workflow_id: str
    ) -> Optional[WorkflowSchema]:
        result = await db.exec(
            select(WorkflowSchema)
            .where(WorkflowSchema.workflow_id == workflow_id)
            .where(WorkflowSchema.user_id == user_id)
        )
        return result.one_or_none()

    async def get_workflow_by_id(
        self, user_id: str, workflow_id: str
    ) -> Optional[Workflow]:
        async with self._get_async_session() as db:
            wf = await self._get_workflow_by_id(db, user_id, workflow_id)
            return wf.to_model() if wf else None

    async def store_workflow(self, user_id: str, workflow: Workflow) -> None:
        async with self._get_async_session() as db:
            # if the workflow already exists, we update the workflow dag.
            stored_workflow = await self._get_workflow_by_id(
                db, user_id, workflow.workflow_id
            )

            if stored_workflow:
                await db.exec(
                    update(WorkflowSchema)
                    .where(WorkflowSchema.user_id == user_id)
                    .where(WorkflowSchema.workflow_id == workflow.workflow_id)
                    .values(
                        workflow_name=workflow.workflow_name,  # consider workflow name changes
                        workflow_dag=workflow.workflow_dag.model_dump(),
                        is_active=workflow.is_active,
                    )
                )
            else:
                await db.exec(
                    insert(WorkflowSchema).values(
                        workflow_id=workflow.workflow_id,
                        user_id=user_id,
                        workflow_name=workflow.workflow_name,
                        workflow_dag=workflow.workflow_dag.model_dump(),
                        is_active=workflow.is_active,
                    )
                )

            await db.commit()

    async def set_workflow_active_state(
        self, user_id: str, workflow_id: str, is_active: bool
    ) -> None:
        async with self._get_async_session() as db:
            stored_workflow = await self._get_workflow_by_id(db, user_id, workflow_id)
            if not stored_workflow:
                raise ValueError(f"Workflow {workflow_id} not found.")

            await db.exec(
                update(WorkflowSchema)
                .where(WorkflowSchema.user_id == user_id)
                .where(WorkflowSchema.workflow_id == workflow_id)
                .values(is_active=is_active)
            )
            await db.commit()

    async def remove_workflow(self, user_id: str, workflow_id: str) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                delete(WorkflowSchema)
                .where(WorkflowSchema.user_id == user_id)
                .where(WorkflowSchema.workflow_id == workflow_id)
            )
            await db.commit()

    async def get_workflow_for_webhook(
        self, workflow_id: str
    ) -> Optional[tuple[str, Workflow]]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(WorkflowSchema).where(WorkflowSchema.workflow_id == workflow_id)
            )
            workflow = result.one_or_none()
            return (workflow.user_id, workflow.to_model()) if workflow else None

    ########################################################
    # Workflow Webhooks
    ########################################################

    async def store_workflow_webhook(
        self, user_id: str, workflow_id: str
    ) -> WorkflowWebhook:
        webhook_id = str(uuid4())
        webhook_secret = generate_hs256(webhook_id)

        async with self._get_async_session() as db:
            # verify that the user_id owns the workflow_id
            workflow = await self._get_workflow_by_id(db, user_id, workflow_id)
            if not workflow:
                raise ValueError("Failed to store webhook. Workflow not found.")

            await db.exec(
                insert(WorkflowWebhookSchema).values(
                    webhook_id=webhook_id,
                    workflow_id=workflow_id,
                    webhook_secret=webhook_secret,
                )
            )
            await db.commit()

        return WorkflowWebhook(
            webhook_id=webhook_id,
            workflow_id=workflow_id,
            webhook_secret=webhook_secret,
        )

    async def get_webhook_for_workflow(
        self, user_id: str, workflow_id: str
    ) -> Optional[WorkflowWebhook]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(WorkflowWebhookSchema)
                .join(WorkflowSchema)
                .where(WorkflowSchema.user_id == user_id)
                .where(WorkflowSchema.workflow_id == workflow_id)
                .where(WorkflowWebhookSchema.workflow_id == workflow_id)
            )
            webhooks = result.all()

            if len(webhooks) == 0:
                return None
            if len(webhooks) > 1:
                # This should not happen!
                raise ValueError(f"Multiple webhooks found for workflow {workflow_id}")

            return webhooks[0].to_model()

    async def _get_webhook(
        db: AdmyralDatabaseSession, webhook_id: str
    ) -> Optional[WorkflowWebhook]:
        result = await db.exec(
            select(WorkflowWebhookSchema).where(
                WorkflowWebhookSchema.webhook_id == webhook_id
            )
        )
        return result.one_or_none()

    async def get_webhook(self, webhook_id: str) -> Optional[WorkflowWebhook]:
        async with self._get_async_session() as db:
            webhook = await self._get_webhook(db, webhook_id)
            return webhook.to_model() if webhook else None

    async def delete_webhook(self, user_id: str, webhook_id: str) -> None:
        async with self._get_async_session() as db:
            # verify that user_id owns the webhook
            workflow = await db.exec(
                select(WorkflowSchema)
                .join(WorkflowWebhookSchema)
                .where(WorkflowSchema.user_id == user_id)
                .where(WorkflowWebhookSchema.webhook_id == webhook_id)
            )
            if not workflow:
                raise ValueError("Failed to delete webhook. Workflow not found.")

            await db.exec(
                delete(WorkflowWebhookSchema).where(
                    WorkflowWebhookSchema.webhook_id == webhook_id
                )
            )
            await db.commit()

    ########################################################
    # Workflow Schedules
    ########################################################

    async def store_schedule(self, user_id: str, schedule: WorkflowSchedule) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                insert(WorkflowScheduleSchema).values(
                    schedule_id=schedule.schedule_id,
                    workflow_id=schedule.workflow_id,
                    user_id=user_id,
                    cron=schedule.cron,
                    interval_seconds=schedule.interval_seconds,
                    interval_minutes=schedule.interval_minutes,
                    interval_hours=schedule.interval_hours,
                    interval_days=schedule.interval_days,
                    default_args=schedule.default_args,
                )
            )
            await db.commit()

    async def list_schedules_for_workflow(
        self, user_id: str, workflow_id: str
    ) -> list[WorkflowSchedule]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(WorkflowScheduleSchema)
                .where(WorkflowScheduleSchema.user_id == user_id)
                .where(WorkflowScheduleSchema.workflow_id == workflow_id)
            )
            schedules = result.all()
            return [schedule.to_model() for schedule in schedules]

    async def delete_schedule(self, user_id: str, schedule_id: str) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                delete(WorkflowScheduleSchema)
                .where(WorkflowScheduleSchema.user_id == user_id)
                .where(WorkflowScheduleSchema.schedule_id == schedule_id)
            )
            await db.commit()

    ########################################################
    # Workflow Runs - User Facing
    ########################################################

    async def list_workflow_runs(
        self, user_id: str, workflow_id: str, limit: int = 100
    ) -> list[WorkflowRunMetadata]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(WorkflowRunSchema)
                .join(WorkflowSchema)
                .where(WorkflowSchema.user_id == user_id)
                .where(WorkflowRunSchema.workflow_id == workflow_id)
                .order_by(WorkflowRunSchema.created_at.desc())
                .limit(limit)
            )
            return [workflow_run.to_metadata() for workflow_run in result.all()]

    async def _get_workflow_run(
        self, db: AdmyralDatabaseSession, user_id: str, workflow_id: str, run_id: str
    ) -> Optional[WorkflowRunSchema]:
        result = await db.exec(
            select(WorkflowRunSchema)
            .join(WorkflowSchema)
            .where(WorkflowSchema.user_id == user_id)
            .where(WorkflowRunSchema.workflow_id == workflow_id)
            .where(WorkflowRunSchema.run_id == run_id)
        )
        return result.one_or_none()

    async def get_workflow_run(
        self, user_id: str, workflow_id: str, run_id: str
    ) -> Optional[WorkflowRun]:
        async with self._get_async_session() as db:
            workflow_run = await self._get_workflow_run(
                db, user_id, workflow_id, run_id
            )
            return workflow_run.to_model() if workflow_run else None

    async def list_workflow_run_steps(
        self, user_id: str, workflow_id: str, run_id: str
    ) -> list[WorkflowRunStepMetadata]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(
                    WorkflowRunStepsSchema.step_id,
                    WorkflowRunStepsSchema.action_type,
                    WorkflowRunStepsSchema.error,
                )
                .join(WorkflowRunSchema)
                .join(WorkflowSchema)
                .where(WorkflowRunSchema.workflow_id == workflow_id)
                .where(WorkflowSchema.user_id == user_id)
                .where(WorkflowSchema.workflow_id == workflow_id)
                .where(WorkflowRunStepsSchema.run_id == run_id)
                .order_by(WorkflowRunStepsSchema.created_at)
            )
            return [
                WorkflowRunStepMetadata.model_validate(
                    {"step_id": row[0], "action_type": row[1], "error": row[2]}
                )
                for row in result.all()
            ]

    async def _get_workflow_run_step(
        self,
        db: AdmyralDatabaseSession,
        user_id: str,
        workflow_id: str,
        run_id: str,
        step_id: str,
    ) -> Optional[WorkflowRunStepsSchema]:
        result = await db.exec(
            select(WorkflowRunStepsSchema)
            .join(WorkflowRunSchema)
            .join(WorkflowSchema)
            .where(WorkflowRunSchema.run_id == run_id)
            .where(WorkflowRunSchema.workflow_id == workflow_id)
            .where(WorkflowSchema.workflow_id == workflow_id)
            .where(WorkflowSchema.user_id == user_id)
            .where(WorkflowRunStepsSchema.step_id == step_id)
        )
        return result.one_or_none()

    async def get_workflow_run_step(
        self, user_id: str, workflow_id: str, run_id: str, step_id: str
    ) -> Optional[WorkflowRunStep]:
        async with self._get_async_session() as db:
            workflow_run_step = await self._get_workflow_run_step(
                db, user_id, workflow_id, run_id, step_id
            )
            return workflow_run_step.to_model() if workflow_run_step else None

    ########################################################
    # Workflow Runs - State Updates during execution
    ########################################################

    async def init_workflow_run(
        self,
        run_id: str,
        step_id: str,
        workflow_id: str,
        source_name: str,
        payload: dict[str, JsonValue],
    ) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                insert(WorkflowRunSchema).values(
                    run_id=run_id,
                    workflow_id=workflow_id,
                    source_name=source_name,
                )
            )

            await db.exec(
                insert(WorkflowRunStepsSchema).values(
                    step_id=step_id, run_id=run_id, action_type="start", result=payload
                )
            )

            await db.commit()

    async def mark_workflow_run_as_completed(
        self, run_id: str, completed_at: datetime
    ) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                update(WorkflowRunSchema)
                .where(WorkflowRunSchema.run_id == run_id)
                .values(
                    completed_at=completed_at,
                )
            )
            await db.commit()

    async def _get_workflow_step_without_user_id(
        self,
        db: AdmyralDatabaseSession,
        run_id: str,
        step_id: str,
    ) -> Optional[WorkflowRunStepsSchema]:
        result = await db.exec(
            select(WorkflowRunStepsSchema)
            .where(WorkflowRunStepsSchema.step_id == step_id)
            .where(WorkflowRunStepsSchema.run_id == run_id)
        )
        return result.one_or_none()

    async def append_logs(
        self,
        step_id: str,
        run_id: str,
        action_type: str,
        prev_step_id: str,
        lines: list[str],
    ) -> None:
        async with self._get_async_session() as db:
            workflow_run_step = await self._get_workflow_step_without_user_id(
                db, run_id, step_id
            )

            if not workflow_run_step:
                await db.exec(
                    insert(WorkflowRunStepsSchema).values(
                        step_id=step_id,
                        run_id=run_id,
                        action_type=action_type,
                        prev_step_id=prev_step_id,
                        logs="\n".join(lines),
                    )
                )
            else:
                await db.exec(
                    update(WorkflowRunStepsSchema)
                    .where(WorkflowRunStepsSchema.step_id == step_id)
                    .values(logs=workflow_run_step.logs + "\n" + "\n".join(lines))
                )
            await db.commit()

    async def store_action_result(
        self,
        step_id: str,
        run_id: str,
        action_type: str,
        prev_step_id: str,
        result: JsonValue,
        input_args: dict[str, JsonValue],
    ) -> None:
        async with self._get_async_session() as db:
            workflow_run_step = await self._get_workflow_step_without_user_id(
                db, run_id, step_id
            )

            if not workflow_run_step:
                await db.exec(
                    insert(WorkflowRunStepsSchema).values(
                        step_id=step_id,
                        run_id=run_id,
                        action_type=action_type,
                        prev_step_id=prev_step_id,
                        result=result,
                        input_args=input_args,
                    )
                )
            else:
                await db.exec(
                    update(WorkflowRunStepsSchema)
                    .where(WorkflowRunStepsSchema.step_id == step_id)
                    .values(
                        result=result,
                        input_args=input_args,
                    )
                )
            await db.commit()

    async def store_workflow_run_error(
        self,
        step_id: str,
        run_id: str,
        action_type: str,
        prev_step_id: str,
        error: str,
        input_args: dict[str, JsonValue],
    ) -> None:
        async with self._get_async_session() as db:
            workflow_run_step = await self._get_workflow_step_without_user_id(
                db, run_id, step_id
            )

            if not workflow_run_step:
                await db.exec(
                    insert(WorkflowRunStepsSchema).values(
                        step_id=step_id,
                        run_id=run_id,
                        action_type=action_type,
                        prev_step_id=prev_step_id,
                        input_args=input_args,
                        error=error,
                    )
                )
            else:
                await db.exec(
                    update(WorkflowRunStepsSchema)
                    .where(WorkflowRunStepsSchema.step_id == step_id)
                    .values(
                        error=error,
                        input_args=input_args,
                    )
                )

            await db.exec(
                update(WorkflowRunSchema)
                .where(WorkflowRunSchema.run_id == run_id)
                .values(failed_at=utc_now())
            )

            await db.commit()

    ########################################################
    # Secrets
    ########################################################

    async def list_secrets(
        self,
        user_id: str,
    ) -> list[SecretMetadata]:
        async with self._get_async_session() as db:
            result = await db.exec(
                select(SecretsSchema).where(SecretsSchema.user_id == user_id)
            )
            return [secret.to_metadata() for secret in result.all()]

    async def _get_secret(
        self, db: AdmyralDatabaseSession, user_id: str, secret_id: str
    ) -> Optional[SecretsSchema]:
        result = await db.exec(
            select(SecretsSchema)
            .where(SecretsSchema.user_id == user_id)
            .where(SecretsSchema.secret_id == secret_id)
        )
        return result.one_or_none()

    async def get_secret(
        self, user_id: str, secret_id: str
    ) -> Optional[EncryptedSecret]:
        async with self._get_async_session() as db:
            secret = await self._get_secret(db, user_id, secret_id)
            return secret.to_model() if secret else None

    async def store_secret(
        self,
        user_id: str,
        secret_id: str,
        encrypted_secret: Optional[str],
        schema: list[str],
    ) -> None:
        async with self._get_async_session() as db:
            secret = await self._get_secret(db, user_id, secret_id)

            if secret:
                await db.exec(
                    update(SecretsSchema)
                    .where(SecretsSchema.user_id == user_id)
                    .where(SecretsSchema.secret_id == secret_id)
                    .values(
                        encrypted_secret=encrypted_secret,
                        schema_json_serialized=json.dumps(schema),
                        updated_at=utc_now(),
                    )
                )
            else:
                await db.exec(
                    insert(SecretsSchema).values(
                        user_id=user_id,
                        secret_id=secret_id,
                        encrypted_secret=encrypted_secret,
                        schema_json_serialized=json.dumps(schema),
                    )
                )

            await db.commit()

    async def delete_secret(self, user_id: str, secret_id: str) -> None:
        async with self._get_async_session() as db:
            await db.exec(
                delete(SecretsSchema)
                .where(SecretsSchema.user_id == user_id)
                .where(SecretsSchema.secret_id == secret_id)
            )
            await db.commit()
