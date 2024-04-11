from __future__ import annotations

from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, TEXT, JSONB
from datetime import datetime
from sqlalchemy.sql.expression import func
from sqlalchemy import Column, ForeignKey
from pydantic import BaseModel

from app.config import settings


class AuthenticatedUser(BaseModel):
    user_id: str
    email: str
    role: str


class Base(SQLModel, table=False):
    __table_args__ = {"schema": settings.DATABASE_SCHEMA}


class UserProfile(Base, table=True):
    __tablename__ = "user_profile"
    
    user_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=True))
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    email: str = Field(sa_type=TEXT())
    email_confirmed_at: datetime = Field(sa_type=TIMESTAMP())

    workflows: list[Workflow] = Relationship(back_populates="user")
    credentials: list[Credential] = Relationship(back_populates="user")


class Credential(Base, table=True):
    user_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.user_profile.user_id", ondelete="CASCADE"),
            primary_key=True,
        )
    )
    credential_name: str = Field(primary_key=True, sa_type=TEXT())
    encrypted_secret: str = Field(sa_type=TEXT())

    user: UserProfile = Relationship(back_populates="credentials", sa_relationship_kwargs=dict(cascade="all, delete"))


class Workflow(Base, table=True):
    workflow_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=True), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    workflow_name: str = Field(sa_type=TEXT())
    workflow_description: str = Field(sa_type=TEXT())
    is_live: bool

    user_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.user_profile.user_id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    user: UserProfile = Relationship(back_populates="workflows", sa_relationship_kwargs=dict(cascade="all, delete"))

    actions: list[ActionNode] = Relationship(back_populates="workflow")
    workflow_runs: list[WorkflowRun] = Relationship(back_populates="workflow")


class ActionType(Enum):
    HTTP_REQUEST = "HttpRequest"
    WEBHOOK = "Webhook"


class ActionNode(Base, table=True):
    __tablename__ = "action_node"
    
    action_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=True), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    workflow_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.workflow.workflow_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    action_name: str = Field(sa_type=TEXT())
    reference_handle: str = Field(sa_type=TEXT())
    action_type: ActionType
    action_description: str = Field(sa_type=TEXT())
    action_definition: dict = Field(sa_type=JSONB())

    workflow: Workflow = Relationship(back_populates="actions", sa_relationship_kwargs=dict(cascade="all, delete"))

    webhooks: list[Webhook] = Relationship(back_populates="action")    
    parent_actions: list[WorkflowEdge] = Relationship(back_populates="parent_action")
    child_actions: list[WorkflowEdge] = Relationship(back_populates="child_action")
    workflow_run_action_states: list[WorkflowRunActionState] = Relationship(back_populates="workflow_run")


class Webhook(Base, table=True):
    webhook_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=True), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    action_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    webhook_secret: Optional[str] = Field(sa_type=TEXT())

    action: ActionNode = Relationship(back_populates="webhooks", sa_relationship_kwargs=dict(cascade="all, delete"))


class WorkflowEdge(Base, table=True):
    __tablename__ = "workflow_edge"
    
    parent_action_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    child_action_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )

    parent_action: ActionNode = Relationship(back_populates="parent_actions", sa_relationship_kwargs=dict(cascade="all, delete"))
    child_action: ActionNode = Relationship(back_populates="child_actions", sa_relationship_kwargs=dict(cascade="all, delete"))


class WorkflowRun(Base, table=True):
    __tablename__ = "workflow_run"
    
    run_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=True), sa_column_kwargs=dict(server_default=func.gen_random_uuid())) 
    workflow_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.workflow.workflow_id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    started_timestamp: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    completed_timestamp: Optional[datetime] = Field(sa_type=TIMESTAMP())

    workflow_run_action_states: list[WorkflowRunActionState] = Relationship(back_populates="workflow_run")

    workflow: Workflow = Relationship(back_populates="workflow_runs", sa_relationship_kwargs=dict(cascade="all, delete"))


class WorkflowRunActionState(Base, table=True):
    __tablename__ ="workflow_run_action_state"
    
    action_state_id: str = Field(primary_key=True, sa_type=UUID(as_uuid=True), sa_column_kwargs=dict(server_default=func.gen_random_uuid()))
    created_at: datetime = Field(sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now()))
    action_state: dict = Field(sa_type=JSONB())

    run_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.workflow_run.run_id", ondelete="CASCADE"),
            nullable=False
        )
    )
    action_id: str = Field(
        sa_column=Column(
            UUID,
            ForeignKey("admyral.action_node.action_id", ondelete="CASCADE"),
            nullable=False
        )
    )

    workflow_run: WorkflowRun = Relationship(back_populates="worklfow_run_action_states", sa_relationship_kwargs=dict(cascade="all, delete"))
    action: ActionNode = Relationship(back_populates="workflow_run_action_states", sa_relationship_kwargs=dict(cascade="all, delete"))
