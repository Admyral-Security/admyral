from typing import Optional

import hmac
import hashlib
from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import aliased
from pydantic import BaseModel

from app.deps import AuthenticatedUser, get_authenticated_user, get_session
from app.models import Workflow, ActionNode, Webhook, WorkflowEdge
from app.schema import ActionType
from app.config import settings


router = APIRouter()


async def raise_if_workflow_not_exists_for_user(
    db: AsyncSession,
    workflow_id: str,
    user_id: str
) -> bool:
    result = await db.exec(
        select(Workflow)
        .where(Workflow.workflow_id == workflow_id)
        .limit(1)
    )
    workflow = result.one_or_none()
    if not workflow or workflow.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow does not exist for user"
        )


async def query_workflow(
    db: AsyncSession,
    workflow_id: str,
    user_id: str
) -> Workflow | None:
    result = await db.exec(
        select(Workflow)
        .where(Workflow.workflow_id == workflow_id and Workflow.user_id == user_id)
        .limit(1)
    )
    return result.one_or_none()


async def query_action(
    db: AsyncSession,
    action_id: str,
    workflow_id: str,
    user_id: str
) -> ActionNode | None:
    # retrieve the action but we also need to make sure that the user only
    # access its own actions by joining with the workflow table and checking
    # for ownership there.
    result = await db.exec(
        select(ActionNode)
            .join(Workflow)
            .where(
                Workflow.workflow_id == workflow_id and Workflow.user_id == user_id and \
                    ActionNode.action_id == action_id
            )
            .limit(1)
    )
    return result.one_or_none()


async def query_edge(
    db: AsyncSession,
    parent_action_id: str,
    child_action_id: str,
    workflow_id: str,
    user_id: str
) -> WorkflowEdge | None:
    parent_action = aliased(ActionNode, name="parent_action")
    child_action = aliased(ActionNode, name="child_action")
    
    result = await db.exec(
        select(WorkflowEdge)
            .join(parent_action, parent_action.action_id == WorkflowEdge.parent_action_id)
            .join(child_action, child_action.action_id == WorkflowEdge.child_action_id)
            .join(Workflow, Workflow.workflow_id == parent_action.workflow_id and Workflow.workflow_id == child_action.workflow_id)
            .where(
                Workflow.workflow_id == workflow_id and Workflow.user_id == user_id and \
                    parent_action.action_id == parent_action_id and child_action.action_id == child_action_id
            )
            .limit(1)
    )
    return result.one_or_none()


#### Workflows


class WorkflowListEntry(BaseModel):
    workflow_id: str
    workflow_name: str
    is_live: bool


@router.get("/", status_code=status.HTTP_200_OK)
async def get_workflows(
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> list[WorkflowListEntry]:
    result = await db.exec(
        select(Workflow)
            .where(Workflow.user_id == user.user_id)
            .order_by(Workflow.created_at.desc())
    )
    return list(
        map(
            lambda workflow: WorkflowListEntry(
                workflow_id=workflow.workflow_id,
                workflow_name=workflow.workflow_name,
                is_live=workflow.is_live
            ),
            result.all()
        )
    )


class WorkflowData(BaseModel):
    workflow_name: str
    workflow_description: str
    is_live: bool


class ActionData(BaseModel):
    action_id: str
    action_name: str
    action_type: ActionType


class EdgeData(BaseModel):
    parent_action_id: str
    child_action_id: str


class WorkflowResponse(BaseModel):
    workflow: WorkflowData
    actions: list[ActionData]
    edges: list[EdgeData]


@router.get(
    "/{workflow_id}",
    status_code=status.HTTP_200_OK
)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> WorkflowResponse:
    workflow = await query_workflow(db, workflow_id, user.user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow does not exist"
        )

    result = await db.exec(
        select(ActionNode)
            .where(ActionNode.workflow_id == workflow_id)
    )
    action_nodes = list(
        map(
            lambda action: ActionData(
                action_id=action.action_id,
                action_name=action.action_name,
                action_type=action.action_type
            ),
            result.all()
        )
    )

    parent_action = aliased(ActionNode, name="parent_action")
    child_action = aliased(ActionNode, name="child_action")
    result = await db.exec(
        select(WorkflowEdge)
            .join(parent_action, parent_action.action_id == WorkflowEdge.parent_action_id)
            .join(child_action, child_action.action_id == WorkflowEdge.child_action_id)
            .join(Workflow, Workflow.workflow_id == parent_action.workflow_id and Workflow.workflow_id == child_action.workflow_id)
            .where(Workflow.workflow_id == workflow_id and Workflow.user_id == user.user_id)
    )
    workflow_edges = list(
        map(
            lambda edge: EdgeData(
                parent_action_id=edge.parent_action_id,
                child_action_id=edge.child_action_id
            ),
            result.all()
        )
    )

    workflow = WorkflowData(
        workflow_name=workflow.workflow_name,
        workflow_description=workflow.workflow_description,
        is_live=workflow.is_live
    )

    return WorkflowResponse(
        workflow=workflow,
        actions=action_nodes,
        edges=workflow_edges
    )


@router.post(
    "/create",
    status_code=status.HTTP_201_CREATED
)
async def create_workflow(
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> str:
    workflow = Workflow(
        workflow_name="My Awesome Workflow",
        workflow_description="",
        is_live=False,
        user_id=user.user_id
    )

    db.add(workflow)
    await db.commit()

    return workflow.workflow_id


@router.post(
    "/{workflow_id}/delete",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    workflow = await query_workflow(db, workflow_id, user.user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    await db.delete(workflow)
    await db.commit()


class UpdateWorkflowRequest(BaseModel):
    workflow_name: Optional[str]
    workflow_description: Optional[str]
    is_live: Optional[bool]


@router.post(
    "/{workflow_id}/update",
    status_code=status.HTTP_204_NO_CONTENT
)
async def update_workflow(
    workflow_id: str,
    request: UpdateWorkflowRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    workflow = await query_workflow(db, workflow_id, user.user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    if request.workflow_name:
        workflow.workflow_name = request.workflow_name
    if request.workflow_description:
        workflow.workflow_description = request.workflow_description
    if request.is_live is not None:
        workflow.is_live = request.is_live

    db.add(workflow)
    await db.commit()


#### Actions


def get_reference_handle(action_name: str) -> str:
    # TODO: we need to generate a unique reference handle
    return action_name.lower().replace(" ", "_")


def create_webhook_secret(webhook_id: str) -> str:
    return hmac.new(
        settings.WEBHOOK_SIGNING_SECRET.encode(),
        msg=webhook_id.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()


class CreateActionRequest(BaseModel):
    action_name: str
    action_description: str
    action_type: ActionType


@router.post(
    "/{workflow_id}/actions/create",
    status_code=status.HTTP_201_CREATED
)
async def create_action(
    workflow_id: str,
    request: CreateActionRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> str:
    await raise_if_workflow_not_exists_for_user(db, workflow_id, user.user_id)

    action_node = ActionNode(
        workflow_id=workflow_id,
        action_name=request.action_name,
        reference_handle=get_reference_handle(request.action_name),
        action_type=request.action_type,
        action_description=request.action_description,
        action_definition={}
    )
    db.add(action_node)

    if request.action_type == ActionType.WEBHOOK:
        await db.flush()

        webhook = Webhook(
            action_id=action_node.action_id
        )
        db.add(webhook)
        await db.flush()

        webhook.webhook_secret = create_webhook_secret(webhook.webhook_id)
        db.add(webhook)

    await db.commit()

    return action_node.action_id


@router.get(
    "/{workflow_id}/actions/{action_id}",
    status_code=status.HTTP_200_OK
)
async def get_action(
    workflow_id: str,
    action_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> ActionNode:
    action_node = await query_action(db, action_id, workflow_id, user.user_id)
    if not action_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action node not found"
        )
    return action_node


@router.post(
    "/{workflow_id}/actions/{action_id}/delete",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_action(
    workflow_id: str,
    action_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    action_node = await query_action(db, action_id, workflow_id, user.user_id)
    if not action_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action node not found"
        )
    
    await db.delete(action_node)
    await db.commit()


class UpdateActionRequest(BaseModel):
    action_name: Optional[str]
    action_description: Optional[str]
    action_definition: Optional[dict]


@router.post(
    "/{workflow_id}/actions/{action_id}/update",
    status_code=status.HTTP_204_NO_CONTENT
)
async def update_action(
    workflow_id: str,
    action_id: str,
    request: UpdateActionRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    action_node = await query_action(db, action_id, workflow_id, user.user_id)
    if not action_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action node not found"
        )

    if request.action_name:
        action_node.action_name = request.action_name
    if request.action_description:
        action_node.action_description = request.action_description
    if request.action_definition:
        # TODO: validation based on action type
        action_node.action_definition = request.action_definition

    db.add(action_node)
    await db.commit()


#### Edges


class EdgeRequest(BaseModel):
    parent_action_id: str
    child_action_id: str


@router.post(
    "/{workflow_id}/edge/create",
    status_code=status.HTTP_201_CREATED
)
async def create_edge(
    workflow_id: str,
    request: EdgeRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    # Verify that both the parent action and child action are valid actions for the user.
    child_action = await query_action(db, request.child_action_id, workflow_id, user.user_id)
    if not child_action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child action not found"
        )
    parent_action = await query_action(db, request.parent_action_id, workflow_id, user.user_id)
    if not parent_action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent action not found"
        )

    # TODO: check connection constraints (e.g., Webhook cannot have incoming edges)

    workflow_edge = WorkflowEdge(
        parent_action_id=request.parent_action_id,
        child_action_id=request.child_action_id
    )
    db.add(workflow_edge)
    await db.commit()

    return "success"


@router.post(
    "/{workflow_id}/edge/delete",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_edge(
    workflow_id: str,
    request: EdgeRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    workflow_edge = await query_edge(
        db,
        request.parent_action_id,
        request.child_action_id,
        workflow_id,
        user.user_id
    )
    if not workflow_edge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow edge not found"
        )

    await db.delete(workflow_edge)
    await db.commit()
