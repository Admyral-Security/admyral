from sqlmodel import Field, Relationship
from sqlalchemy import TEXT, ForeignKeyConstraint
from typing import TYPE_CHECKING

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import WorkflowWebhook

if TYPE_CHECKING:
    from admyral.db.schemas.workflow_schemas import WorkflowSchema


class WorkflowWebhookSchema(BaseSchema, table=True):
    """
    Schema for Workflow Webhook
    """

    __tablename__ = "workflow_webhooks"

    __table_args__ = (
        ForeignKeyConstraint(
            ["workflow_id"],
            ["workflows.workflow_id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    webhook_id: str = Field(
        sa_type=TEXT(), primary_key=True, default_factory=BaseSchema.generate_uuid4
    )

    # foreign keys
    workflow_id: str = Field(sa_type=TEXT(), index=True)

    # other fields
    webhook_secret: str = Field(sa_type=TEXT())

    # relationship parents
    workflow: "WorkflowSchema" = Relationship(back_populates="webhooks")

    def to_model(self, include_resources: bool = False) -> WorkflowWebhook:
        return WorkflowWebhook.model_validate(
            {
                "webhook_id": self.webhook_id,
                "workflow_id": self.workflow_id,
                "webhook_secret": self.webhook_secret,
            }
        )
