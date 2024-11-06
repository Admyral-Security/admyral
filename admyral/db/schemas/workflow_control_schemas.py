from sqlmodel import Field, Relationship
from sqlalchemy import TEXT, ForeignKeyConstraint, BOOLEAN
from typing import TYPE_CHECKING

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import WorkflowControl

if TYPE_CHECKING:
    from admyral.db.schemas.workflow_schemas import WorkflowSchema


class WorkflowControlSchema(BaseSchema, table=True):
    """
    Schema for Workflow Control Status
    """

    __tablename__ = "workflow_controls"

    __table_args__ = (
        ForeignKeyConstraint(
            ["workflow_id"],
            ["workflows.workflow_id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    workflow_id: str = Field(sa_type=TEXT(), primary_key=True)
    run_id: str = Field(sa_type=TEXT(), primary_key=True)

    # other fields
    result: bool = Field(sa_type=BOOLEAN(), default=False)

    # relationship parents
    workflow: "WorkflowSchema" = Relationship(back_populates="controls")

    def to_model(self, include_resources: bool = False) -> WorkflowControl:
        return WorkflowControl.model_validate(
            {
                "workflow_id": self.workflow_id,
                "run_id": self.run_id,
                "result": self.result,
            }
        )
