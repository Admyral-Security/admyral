from typing import TYPE_CHECKING
from sqlmodel import (
    Field,
    Relationship,
    UniqueConstraint,
    JSON,
    TEXT,
    BOOLEAN,
    ForeignKeyConstraint,
)

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import Workflow, WorkflowMetadata
from admyral.db.schemas.workflow_run_schemas import WorkflowRunSchema
from admyral.db.schemas.workflow_webhook_schemas import WorkflowWebhookSchema
from admyral.db.schemas.workflow_schedule_schemas import WorkflowScheduleSchema
from admyral.typings import JsonValue

if TYPE_CHECKING:
    from admyral.db.schemas.auth_schemas import UserSchema


class WorkflowSchema(BaseSchema, table=True):
    """
    Schema for Workflow
    """

    __tablename__ = "workflows"
    # workflow names must be unique per user!
    __table_args__ = (
        UniqueConstraint("user_id", "workflow_name", name="unique_workflow_name"),
        ForeignKeyConstraint(
            ["user_id"],
            ["User.id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    workflow_id: str = Field(sa_type=TEXT(), primary_key=True)

    # foreign keys
    user_id: str = Field(
        sa_type=TEXT(), index=True
    )  # index for faster workflow listing

    # other fields
    workflow_name: str = Field(
        sa_type=TEXT(), index=True
    )  # index for faster workflow loading
    workflow_dag: JsonValue = Field(sa_type=JSON())

    # relationship parent
    user: "UserSchema" = Relationship(back_populates="workflows")

    # relationship children
    workflow_runs: list[WorkflowRunSchema] = Relationship(
        back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    webhooks: list[WorkflowWebhookSchema] = Relationship(
        back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    schedules: list[WorkflowScheduleSchema] = Relationship(
        back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    is_active: bool = Field(sa_type=BOOLEAN(), default=False)

    def to_model(self, include_resources: bool = False) -> Workflow:
        # TODO: handle workflow runs, webhooks, schedules
        return Workflow.model_validate(
            {
                "workflow_id": self.workflow_id,
                "workflow_name": self.workflow_name,
                "workflow_dag": self.workflow_dag,
                "is_active": self.is_active,
            }
        )

    def to_metadata(self) -> WorkflowMetadata:
        return WorkflowMetadata(
            workflow_id=self.workflow_id,
            workflow_name=self.workflow_name,
            workflow_description=self.workflow_dag.get("description"),
            created_at=self.created_at,
            is_active=self.is_active,
        )
