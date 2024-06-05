from sqlmodel import SQLModel, Field, Relationship
from typing import Any, Optional
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, TEXT, JSONB, ENUM
from datetime import datetime
from sqlalchemy.sql.expression import func
from sqlalchemy import Column, ForeignKey

from app.config import settings
from app.schema import ActionType, EdgeType


# We must register the ENUM types with the database under the correct schema
action_type_enum = ENUM(ActionType, schema=settings.DATABASE_SCHEMA, create_type=False, name="actiontype")
edge_type_enum = ENUM(EdgeType, schema=settings.DATABASE_SCHEMA, create_type=False, name="edgetype")


class Base(SQLModel, table=False):
    __table_args__ = {"schema": settings.DATABASE_SCHEMA}


class UserProfile(Base, table=True):
    __tablename__ = "user_profile"
    
    user_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False))
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    email: str = Field(sa_type=TEXT())
    email_confirmed_at: Optional[datetime] = Field(sa_type=TIMESTAMP())
    company: str = Field(sa_type=TEXT(), default="")
    first_name: str = Field(sa_type=TEXT(), default="")
    last_name: str = Field(sa_type=TEXT(), default="")

    workflows: list["Workflow"] = Relationship(back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete"))
    credentials: list["Credential"] = Relationship(back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete"))
    workflow_generations: list["WorkflowGeneration"] = Relationship(back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete"))


class Credential(Base, table=True):
    user_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.user_profile.user_id", ondelete="CASCADE"),
            primary_key=True,
        )
    )
    credential_name: str = Field(primary_key=True, sa_type=TEXT())
    encrypted_secret: str = Field(sa_type=TEXT())
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    credential_type: Optional[str] = Field(sa_type=TEXT(), nullable=True)

    user: UserProfile = Relationship(back_populates="credentials")


class Workflow(Base, table=True):
    workflow_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    workflow_name: str = Field(sa_type=TEXT())
    workflow_description: str = Field(sa_type=TEXT())
    is_live: bool = Field(default=False)
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))

    # Note: we have a template workflow iff is_template is True and user_id is NULL
    user_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.user_profile.user_id", ondelete="CASCADE"),
        ),
    )

    is_template: bool = Field(default=False)

    user: UserProfile = Relationship(back_populates="workflows")

    actions: list["ActionNode"] = Relationship(back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete"))
    workflow_runs: list["WorkflowRun"] = Relationship(back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete"))
    workflow_template_metadata: "WorkflowTemplateMetadata" = Relationship(back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete"))


class ActionNode(Base, table=True):
    __tablename__ = "action_node"
    
    action_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    workflow_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.workflow.workflow_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    action_name: str = Field(sa_type=TEXT())
    reference_handle: str = Field(sa_type=TEXT())
    action_type: ActionType = Field(sa_column=Column(action_type_enum))
    action_description: str = Field(sa_type=TEXT())
    action_definition: dict = Field(sa_type=JSONB())
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    x_position: float
    y_position: float

    workflow: Workflow = Relationship(back_populates="actions")

    webhooks: list["Webhook"] = Relationship(back_populates="action", sa_relationship_kwargs=dict(cascade="all, delete"))
    parent_actions: list["WorkflowEdge"] = Relationship(back_populates="parent_action", sa_relationship_kwargs=dict(cascade="all, delete", foreign_keys="[WorkflowEdge.parent_action_id]"))
    child_actions: list["WorkflowEdge"] = Relationship(back_populates="child_action", sa_relationship_kwargs=dict(cascade="all, delete", foreign_keys="[WorkflowEdge.child_action_id]"))
    workflow_run_action_states: list["WorkflowRunActionState"] = Relationship(back_populates="action_node", sa_relationship_kwargs=dict(cascade="all, delete"))
    action_input_templates: list["ActionInputTemplate"] = Relationship(back_populates="action", sa_relationship_kwargs=dict(cascade="all, delete"))


class ActionInputTemplate(Base, table=True):
    __tablename__ = "action_input_template"

    action_input_template_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    template_name: str = Field(sa_type=TEXT())
    template: str = Field(sa_type=TEXT())
    action_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    action: ActionNode = Relationship(back_populates="action_input_templates")


class Webhook(Base, table=True):
    webhook_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    action_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    webhook_secret: Optional[str] = Field(sa_type=TEXT())

    action: ActionNode = Relationship(back_populates="webhooks")


class WorkflowEdge(Base, table=True):
    __tablename__ = "workflow_edge"
    
    parent_action_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    child_action_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    edge_type: EdgeType = Field(sa_column=Column(edge_type_enum))
    parent_node_handle: Optional[str] = Field(sa_type=TEXT(), nullable=True)
    child_node_handle: Optional[str] = Field(sa_type=TEXT(), nullable=True)

    parent_action: ActionNode = Relationship(back_populates="parent_actions", sa_relationship_kwargs=dict(foreign_keys="[WorkflowEdge.parent_action_id]"))
    child_action: ActionNode = Relationship(back_populates="child_actions", sa_relationship_kwargs=dict(foreign_keys="[WorkflowEdge.child_action_id]"))


class WorkflowRun(Base, table=True):
    __tablename__ = "workflow_run"
    
    run_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid())) 
    workflow_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.workflow.workflow_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    started_timestamp: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    completed_timestamp: Optional[datetime] = Field(sa_type=TIMESTAMP())

    error: Optional[str] = Field(sa_type=TEXT(), nullable=True)

    workflow_run_action_states: list["WorkflowRunActionState"] = Relationship(back_populates="workflow_run", sa_relationship_kwargs=dict(cascade="all, delete"))

    workflow: Workflow = Relationship(back_populates="workflow_runs")


class WorkflowRunActionState(Base, table=True):
    __tablename__ ="workflow_run_action_state"
    
    action_state_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    action_state: Any = Field(sa_type=JSONB())
    is_error: bool = Field(default=False)

    run_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.workflow_run.run_id", ondelete="CASCADE"),
            nullable=False
        )
    )
    action_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            nullable=False
        )
    )
    prev_action_state_id: Optional[str] = Field(sa_type=UUID(as_uuid=False), nullable=True)

    workflow_run: WorkflowRun = Relationship(back_populates="workflow_run_action_states")
    action_node: ActionNode = Relationship(back_populates="workflow_run_action_states")


class WorkflowTemplateMetadata(Base, table=True):
    __tablename__ = "workflow_template_metadata"

    workflow_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.workflow.workflow_id", ondelete="CASCADE"),
            nullable=False,
            primary_key=True,
        )
    )
    template_headline: str = Field(sa_type=TEXT())
    template_description: str = Field(sa_type=TEXT())
    category: str = Field(sa_type=TEXT())
    icon: Optional[str] = Field(sa_type=TEXT(), nullable=True)

    workflow: Workflow = Relationship(back_populates="workflow_template_metadata")


class WorkflowGeneration(Base, table=True):
    __tablename__ = "workflow_generation"

    generation_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    # Note: we have a template workflow iff is_template is True and user_id is NULL
    user_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.user_profile.user_id", ondelete="CASCADE"),
        ),
    )

    total_tokens: int
    prompt_tokens: int
    completion_tokens: int

    user_input: str = Field(sa_type=TEXT())
    generated_actions: list[dict] = Field(sa_type=JSONB())
    generated_edges: list[dict] = Field(sa_type=JSONB())

    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))

    user: UserProfile = Relationship(back_populates="workflow_generations")
