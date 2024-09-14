from sqlmodel import Field, Relationship
from sqlalchemy import TEXT, JSON, ForeignKeyConstraint, TIMESTAMP
from typing import TYPE_CHECKING
from datetime import datetime

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import WorkflowRun, WorkflowRunStep, WorkflowRunMetadata
from admyral.typings import JsonValue

if TYPE_CHECKING:
    from admyral.db.schemas.workflow_schemas import WorkflowSchema


class WorkflowRunSchema(BaseSchema, table=True):
    """
    Schema for Workflow Run
    """

    __tablename__ = "workflow_runs"

    __table_args__ = (
        ForeignKeyConstraint(
            ["workflow_id"],
            ["workflows.workflow_id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    run_id: str = Field(sa_type=TEXT(), primary_key=True)

    # foreign keys
    workflow_id: str = Field(sa_type=TEXT())

    # other fields
    source_name: str = Field(sa_type=TEXT())
    completed_at: datetime | None = Field(sa_type=TIMESTAMP(), nullable=True)
    failed_at: datetime | None = Field(sa_type=TIMESTAMP(), nullable=True)
    canceled_at: datetime | None = Field(sa_type=TIMESTAMP(), nullable=True)

    # relationship parents
    workflow: "WorkflowSchema" = Relationship(back_populates="workflow_runs")

    # relationship children
    steps: list["WorkflowRunStepsSchema"] = Relationship(
        back_populates="workflow_run",
        sa_relationship_kwargs=dict(cascade="all, delete"),
    )

    def to_model(self, include_resources: bool = False) -> WorkflowRun:
        workflow_run = WorkflowRun.model_validate(
            {
                "run_id": self.run_id,
                "trigger_id": self.trigger_id,
                "payload": self.payload,
                "created_at": self.created_at,
                "completed_at": self.completed_at,
                "failed_at": self.failed_at,
                "canceled_at": self.canceled_at,
            }
        )

        # if include_resources:
        #     # TODO: do we have access to self.action_executions???
        #     workflow_run.action_executions = [
        #         action_execution.to_model()
        #         for action_execution in self.action_executions
        #     ]

        return workflow_run

    def to_metadata(self) -> WorkflowRunMetadata:
        return WorkflowRunMetadata.model_validate(
            {
                "run_id": self.run_id,
                "created_at": self.created_at,
                "completed_at": self.completed_at,
                "failed_at": self.failed_at,
                "canceled_at": self.canceled_at,
            }
        )


class WorkflowRunStepsSchema(BaseSchema, table=True):
    """
    Schema for Workflow Run Step
    """

    __tablename__ = "workflow_run_steps"

    __table_args__ = (
        ForeignKeyConstraint(
            ["run_id"],
            ["workflow_runs.run_id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    step_id: str = Field(sa_type=TEXT(), primary_key=True)

    # foreign keys
    run_id: str = Field(sa_type=TEXT())

    # other fields
    prev_step_id: str | None = Field(sa_type=TEXT(), nullable=True)
    action_type: str = Field(sa_type=TEXT())
    input_args: dict[str, JsonValue] | None = Field(sa_type=JSON(), nullable=True)
    logs: str | None = Field(sa_type=TEXT(), nullable=True)
    result: JsonValue = Field(sa_type=JSON(), nullable=True)
    error: str | None = Field(sa_type=TEXT(), nullable=True)

    # relationship parents
    workflow_run: WorkflowRunSchema = Relationship(back_populates="steps")

    def to_model(self, include_resources: bool = False) -> WorkflowRunStep:
        return WorkflowRunStep.model_validate(
            {
                "step_id": self.step_id,
                "action_type": self.action_type,
                "prev_step_id": self.prev_step_id,
                "logs": self.logs,
                "result": self.result,
                "error": self.error,
                "input_args": self.input_args,
            }
        )
