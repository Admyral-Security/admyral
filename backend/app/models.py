from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, TEXT, JSONB
from datetime import datetime
from sqlalchemy.sql.expression import func
from sqlalchemy import Column, ForeignKey

from app.config import settings
from app.schema import ActionType, EdgeType


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

    user: UserProfile = Relationship(back_populates="credentials")


class Workflow(Base, table=True):
    workflow_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    workflow_name: str = Field(sa_type=TEXT())
    workflow_description: str = Field(sa_type=TEXT())
    is_live: bool
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))

    user_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("admyral.user_profile.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    user: UserProfile = Relationship(back_populates="workflows")

    actions: list["ActionNode"] = Relationship(back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete"))
    workflow_runs: list["WorkflowRun"] = Relationship(back_populates="workflow", sa_relationship_kwargs=dict(cascade="all, delete"))


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
    action_type: ActionType
    action_description: str = Field(sa_type=TEXT())
    action_definition: dict = Field(sa_type=JSONB())
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    x_position: float = Field(default=300.0)
    y_position: float = Field(default=300.0)

    workflow: Workflow = Relationship(back_populates="actions")

    webhooks: list["Webhook"] = Relationship(back_populates="action", sa_relationship_kwargs=dict(cascade="all, delete"))
    parent_actions: list["WorkflowEdge"] = Relationship(back_populates="parent_action", sa_relationship_kwargs=dict(cascade="all, delete", foreign_keys="[WorkflowEdge.parent_action_id]"))
    child_actions: list["WorkflowEdge"] = Relationship(back_populates="child_action", sa_relationship_kwargs=dict(cascade="all, delete", foreign_keys="[WorkflowEdge.child_action_id]"))
    workflow_run_action_states: list["WorkflowRunActionState"] = Relationship(back_populates="action_node", sa_relationship_kwargs=dict(cascade="all, delete"))


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
    edge_type: EdgeType = Field(default=EdgeType.DEFAULT)
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

    workflow_run_action_states: list["WorkflowRunActionState"] = Relationship(back_populates="workflow_run", sa_relationship_kwargs=dict(cascade="all, delete"))

    workflow: Workflow = Relationship(back_populates="workflow_runs")


class WorkflowRunActionState(Base, table=True):
    __tablename__ ="workflow_run_action_state"
    
    action_state_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=False), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    action_state: dict = Field(sa_type=JSONB())

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

    workflow_run: WorkflowRun = Relationship(back_populates="workflow_run_action_states")
    action_node: ActionNode = Relationship(back_populates="workflow_run_action_states")
