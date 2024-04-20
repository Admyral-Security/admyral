from typing import Optional

from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, and_
from sqlalchemy.orm import aliased
from pydantic import BaseModel

from app.deps import AuthenticatedUser, get_authenticated_user, get_session
from app.models import Workflow, ActionNode, Webhook, WorkflowEdge
from app.schema import ActionType


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
        .where(Workflow.workflow_id == workflow_id)
        .where(Workflow.user_id == user_id)
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
            .where(Workflow.workflow_id == workflow_id)
            .where(Workflow.user_id == user_id)
            .where(ActionNode.action_id == action_id)
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
            .join(Workflow, 
                and_(
                    Workflow.workflow_id == parent_action.workflow_id,
                    Workflow.workflow_id == child_action.workflow_id
                )
            )
            .where(Workflow.workflow_id == workflow_id)
            .where(Workflow.user_id == user_id)
            .where(parent_action.action_id == parent_action_id)
            .where(child_action.action_id == child_action_id)
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


class ActionData(BaseModel):
    action_id: str
    action_name: str
    reference_handle: str
    action_type: ActionType
    action_description: str
    x_position: float 
    y_position: float
    action_definition: dict
    # Webhook specific fields
    webhook_id: Optional[str] = None
    secret: Optional[str] = None


class EdgeData(BaseModel):
    parent_action_id: str
    child_action_id: str


class WorkflowData(BaseModel):
    workflow_name: str
    workflow_description: str
    is_live: bool
    actions: list[ActionData]
    edges: list[EdgeData]


# TODO: optimize data fetching: actions, workflow, and edges concurrently as well as webhooks in one query
@router.get(
    "/{workflow_id}",
    status_code=status.HTTP_200_OK
)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> WorkflowData:
    # Fetch general workflow data
    workflow = await query_workflow(db, workflow_id, user.user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow does not exist"
        )

    # Fetch actions
    result = await db.exec(
        select(ActionNode)
            .where(ActionNode.workflow_id == workflow_id)
    )
    action_nodes = list(
        map(
            lambda action: ActionData(
                action_id=action.action_id,
                action_name=action.action_name,
                reference_handle=action.reference_handle,
                action_type=action.action_type,
                action_description=action.action_description,
                x_position=action.x_position,
                y_position=action.y_position,
                action_definition=action.action_definition,
            ),
            result.all()
        )
    )

    # Enrich webhook actions with webhook data
    for action in action_nodes:
        if action.action_type == ActionType.WEBHOOK:
            result = await db.exec(select(Webhook).where(Webhook.action_id == action.action_id).limit(1))
            webhook = result.one_or_none()
            if not webhook:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Webhook does not exist"
                )
            action.webhook_id = webhook.webhook_id
            action.secret = webhook.webhook_secret

    # Fetch all related edges
    parent_action = aliased(ActionNode, name="parent_action")
    child_action = aliased(ActionNode, name="child_action")
    result = await db.exec(
        select(WorkflowEdge)
            .join(parent_action, parent_action.action_id == WorkflowEdge.parent_action_id)
            .join(child_action, child_action.action_id == WorkflowEdge.child_action_id)
            .join(Workflow,
                and_(
                    Workflow.workflow_id == parent_action.workflow_id,
                    Workflow.workflow_id == child_action.workflow_id
                )
            )
            .where(Workflow.workflow_id == workflow_id)
            .where(Workflow.user_id == user.user_id)
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

    return WorkflowData(
        workflow_name=workflow.workflow_name,
        workflow_description=workflow.workflow_description,
        is_live=workflow.is_live,
        actions=action_nodes,
        edges=workflow_edges
    )


class WorkflowUpdateRequest(BaseModel):
    workflow: WorkflowData
    deleted_nodes: list[str]
    deleted_edges: list[tuple[str, str]]


NEW_MARKER = "new_"


@router.post(
    "/{workflow_id}/update",
    status_code=status.HTTP_201_CREATED
)
async def update_workflow(
    workflow_id: str,
    request: WorkflowUpdateRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> WorkflowData:
    # 1) Update workflow
    workflow = await query_workflow(db, workflow_id, user.user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow does not exist"
        )

    workflow.workflow_name = request.workflow.workflow_name
    workflow.workflow_description = request.workflow.workflow_description
    workflow.is_live = request.workflow.is_live

    db.add(workflow)
    await db.commit()

    # 2) Update actions & webhooks
    output_actions = []

    temp_ids_to_new_action_ids = {}
    for action in request.workflow.actions:
        if action.action_id.startswith(NEW_MARKER):
            # Create new action
            new_action = ActionNode(
                workflow_id=workflow_id,
                action_name=action.action_name,
                reference_handle=action.reference_handle,
                action_type=action.action_type,
                action_description=action.action_description,
                action_definition=action.action_definition,
                x_position=action.x_position,
                y_position=action.y_position
            )
            db.add(new_action)
            await db.commit()
            temp_ids_to_new_action_ids[action.action_id] = new_action.action_id

            if action.action_type == ActionType.WEBHOOK:
                webhook = Webhook(
                    webhook_id=action.webhook_id,
                    action_id=new_action.action_id,
                    webhook_secret=action.secret
                )
                db.add(webhook)
                await db.commit()

            action.action_id = new_action.action_id
        else:
            # Update existing action
            existing_action = await query_action(db, action.action_id, workflow_id, user.user_id)
            if not existing_action:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Action node not found"
                )

            existing_action.action_name = action.action_name
            existing_action.reference_handle = action.reference_handle
            existing_action.action_type = action.action_type
            existing_action.action_description = action.action_description
            existing_action.action_definition = action.action_definition
            existing_action.x_position = action.x_position
            existing_action.y_position = action.y_position

            db.add(existing_action)
            await db.commit()

        output_actions.append(action)

    # 3) Update edges
    output_edges = []
    
    for edge in request.workflow.edges: 
        parent_action_id = temp_ids_to_new_action_ids.get(edge.parent_action_id, edge.parent_action_id)
        child_action_id = temp_ids_to_new_action_ids.get(edge.child_action_id, edge.child_action_id)

        existing_edge = await query_edge(db, parent_action_id, child_action_id, workflow_id, user.user_id)
        if not existing_edge:
            workflow_edge = WorkflowEdge(
                parent_action_id=parent_action_id,
                child_action_id=child_action_id
            )
            db.add(workflow_edge)
            await db.commit()

            edge.parent_action_id = parent_action_id
            edge.child_action_id = child_action_id
        
        output_edges.append(edge)

    # 4) Delete edges
    for (parent_action_id, child_action_id) in request.deleted_edges:
        existing_edge = await query_edge(db, parent_action_id, child_action_id, workflow_id, user.user_id)
        if existing_edge:
            await db.delete(existing_edge)
            await db.commit()

    # 5) Delete nodes incl. their involved edges
    for deleted_node in request.deleted_nodes:
        existing_action = await query_action(db, deleted_node, workflow_id, user.user_id)
        if existing_action:
            await db.delete(existing_action)
            await db.commit()

    # Create updated workflow data
    workflow_data = request.workflow
    workflow_data.actions = output_actions
    workflow_data.edges = output_edges

    return workflow_data


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


class PublishWorkflowRequest(BaseModel):
    is_live: bool


@router.post("/{workflow_id}/publish", status_code=status.HTTP_204_NO_CONTENT)
async def publish_workflow(
    workflow_id: str,
    request: PublishWorkflowRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    workflow = await query_workflow(db, workflow_id, user.user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    workflow.is_live = request.is_live
    db.add(workflow)
    await db.commit()
