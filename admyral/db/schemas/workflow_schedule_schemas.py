from sqlmodel import Field, Relationship
from sqlalchemy import TEXT, ForeignKeyConstraint, JSON, INTEGER
from typing import TYPE_CHECKING, Optional

from admyral.typings import JsonValue
from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import WorkflowSchedule

if TYPE_CHECKING:
    from admyral.db.schemas.workflow_schemas import WorkflowSchema


class WorkflowScheduleSchema(BaseSchema, table=True):
    """
    Schema for Workflow Schedules
    """

    __tablename__ = "workflow_schedules"

    __table_args__ = (
        ForeignKeyConstraint(
            ["workflow_id"],
            ["workflows.workflow_id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    schedule_id: str = Field(
        sa_type=TEXT(),
        primary_key=True,
    )

    # foreign keys
    user_id: str = Field(sa_type=TEXT(), index=True)
    workflow_id: str = Field(sa_type=TEXT(), index=True)

    # other fields
    cron: Optional[str] = Field(sa_type=TEXT(), nullable=True)
    interval_seconds: Optional[int] = Field(sa_type=INTEGER(), nullable=True)
    interval_minutes: Optional[int] = Field(sa_type=INTEGER(), nullable=True)
    interval_hours: Optional[int] = Field(sa_type=INTEGER(), nullable=True)
    interval_days: Optional[int] = Field(sa_type=INTEGER(), nullable=True)
    default_args: Optional[dict[str, JsonValue]] = Field(sa_type=JSON(), nullable=True)

    # relationship parents
    workflow: "WorkflowSchema" = Relationship(back_populates="schedules")

    def to_model(self, include_resources: bool = False) -> WorkflowSchedule:
        return WorkflowSchedule.model_validate(
            {
                "schedule_id": self.schedule_id,
                "workflow_id": self.workflow_id,
                "cron": self.cron,
                "interval_seconds": self.interval_seconds,
                "interval_minutes": self.interval_minutes,
                "interval_hours": self.interval_hours,
                "interval_days": self.interval_days,
                "default_args": self.default_args,
            }
        )
