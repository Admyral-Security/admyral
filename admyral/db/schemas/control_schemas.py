from typing import TYPE_CHECKING
from sqlmodel import (
    Field,
    Relationship,
    TEXT,
    UniqueConstraint,
    ForeignKeyConstraint,
)

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import Control, ControlsWorkflowsMapping

if TYPE_CHECKING:
    from admyral.db.schemas.auth_schemas import UserSchema
    from admyral.db.schemas.workflow_schemas import WorkflowSchema


class ControlsWorkflowsMappingSchema(BaseSchema, table=True):
    """
    Schema for Controls Workflows Mapping
    """

    __tablename__ = "controls_workflows"
    __table_args__ = (
        ForeignKeyConstraint(
            ["control_id", "user_id"],
            ["controls.control_id", "controls.user_id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["workflow_id"],
            ["workflows.workflow_id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    control_id: int = Field(primary_key=True, default=None)
    user_id: str = Field(sa_type=TEXT(), primary_key=True)
    workflow_id: str = Field(sa_type=TEXT(), primary_key=True)

    # relationships
    control: "ControlSchema" = Relationship(back_populates="control_workflow_mappings")
    workflow: "WorkflowSchema" = Relationship(
        back_populates="control_workflow_mappings"
    )

    def to_model(self) -> ControlsWorkflowsMapping:
        return ControlsWorkflowsMapping.model_validate(
            {
                "control_id": self.control_id,
                "workflow_id": self.workflow_id,
            }
        )


class ControlSchema(BaseSchema, table=True):
    """
    Schema for Control
    """

    __tablename__ = "controls"
    __table_args__ = (
        UniqueConstraint("user_id", "control_id", name="unique_control_id"),
        ForeignKeyConstraint(
            ["user_id"],
            ["User.id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    control_id: int = Field(primary_key=True, default=None)
    user_id: str = Field(sa_type=TEXT(), primary_key=True)

    # other fields
    control_name: str = Field(sa_type=TEXT(), index=True)
    control_description: str = Field(sa_type=TEXT())

    # relationships
    control_workflow_mappings: list[ControlsWorkflowsMappingSchema] = Relationship(
        back_populates="control"
    )
    workflows: list["WorkflowSchema"] = Relationship(
        back_populates="controls", link_model=ControlsWorkflowsMappingSchema
    )

    # relationship parent
    user: "UserSchema" = Relationship(back_populates="controls")

    def to_model(self) -> Control:
        return Control.model_validate(
            {
                "control_id": self.control_id,
                "user_id": self.user_id,
                "control_name": self.control_name,
                "control_description": self.control_description,
            }
        )
