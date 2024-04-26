from typing import Optional

from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, and_, func
from sqlalchemy.orm import aliased
from pydantic import BaseModel
import uuid
import hmac
import hashlib
from datetime import datetime

from app.deps import AuthenticatedUser, get_authenticated_user, get_session
from app.models import Workflow, ActionNode, Webhook, WorkflowEdge, WorkflowTemplateMetadata, WorkflowRun, WorkflowRunActionState
from app.schema import ActionType, EdgeType
from app.config import settings


router = APIRouter()


async def raise_if_workflow_not_exists_for_user(
    db: AsyncSession,
    workflow_id: str,
    user_id: str | None
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
    user_id: str | None,
    is_template: bool = False
) -> Workflow | None:
    result = await db.exec(
        select(Workflow)
        .where(Workflow.workflow_id == workflow_id)
        .where(Workflow.user_id == user_id)
        .where(Workflow.is_template == is_template)
        .limit(1)
    )
    return result.one_or_none()


async def query_action(
    db: AsyncSession,
    action_id: str,
    workflow_id: str,
    user_id: str | None,
    is_template: bool = False
) -> ActionNode | None:
    # retrieve the action but we also need to make sure that the user only
    # access its own actions by joining with the workflow table and checking
    # for ownership there.
    result = await db.exec(
        select(ActionNode)
            .join(Workflow)
            .where(Workflow.workflow_id == workflow_id)
            .where(Workflow.user_id == user_id)
            .where(Workflow.is_template == is_template)
            .where(ActionNode.action_id == action_id)
            .limit(1)
    )
    return result.one_or_none()


async def query_edge(
    db: AsyncSession,
    parent_action_id: str,
    child_action_id: str,
    workflow_id: str,
    user_id: str | None,
    is_template: bool = False
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
                    Workflow.workflow_id == child_action.workflow_id,
                    Workflow.is_template == is_template
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


@router.get("", status_code=status.HTTP_200_OK)
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
    edge_type: EdgeType
    parent_node_handle: Optional[str]
    child_node_handle: Optional[str]


class WorkflowData(BaseModel):
    workflow_name: str
    workflow_description: str
    is_live: bool
    actions: list[ActionData]
    edges: list[EdgeData]


# TODO: optimize data fetching: actions, workflow, and edges concurrently as well as webhooks in one query
async def get_workflow_impl(
    workflow_id: str,
    db: AsyncSession,
    user_id: str | None,
    is_template: bool
) -> WorkflowData:
    # Fetch general workflow data
    workflow = await query_workflow(db, workflow_id, user_id, is_template)
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
            result = await db.exec(
                select(Webhook)
                    .where(Webhook.action_id == action.action_id)
                    .limit(1)
                )
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
                    Workflow.workflow_id == child_action.workflow_id,
                    Workflow.is_template == is_template
                )
            )
            .where(Workflow.workflow_id == workflow_id)
            .where(Workflow.user_id == user_id)
    )
    workflow_edges = list(
        map(
            lambda edge: EdgeData(
                parent_action_id=edge.parent_action_id,
                child_action_id=edge.child_action_id,
                edge_type=edge.edge_type,
                parent_node_handle=edge.parent_node_handle,
                child_node_handle=edge.child_node_handle
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

@router.get(
    "/{workflow_id}",
    status_code=status.HTTP_200_OK
)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> WorkflowData:
    return await get_workflow_impl(workflow_id, db, user.user_id, False)


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
    await db.flush()

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
            await db.flush()
            temp_ids_to_new_action_ids[action.action_id] = new_action.action_id

            if action.action_type == ActionType.WEBHOOK:
                webhook = Webhook(
                    webhook_id=action.webhook_id,
                    action_id=new_action.action_id,
                    webhook_secret=action.secret
                )
                db.add(webhook)
                await db.flush()

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
            await db.flush()

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
                child_action_id=child_action_id,
                edge_type=edge.edge_type,
                parent_node_handle=edge.parent_node_handle,
                child_node_handle=edge.child_node_handle
            )
            db.add(workflow_edge)
            await db.flush()

            edge.parent_action_id = parent_action_id
            edge.child_action_id = child_action_id
        
        output_edges.append(edge)

    # 4) Delete edges
    for (parent_action_id, child_action_id) in request.deleted_edges:
        existing_edge = await query_edge(db, parent_action_id, child_action_id, workflow_id, user.user_id)
        if existing_edge:
            await db.delete(existing_edge)
            await db.flush()

    # 5) Delete nodes incl. their involved edges
    for deleted_node in request.deleted_nodes:
        existing_action = await query_action(db, deleted_node, workflow_id, user.user_id)
        if existing_action:
            await db.delete(existing_action)
            await db.flush()

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


@router.get("/templates/list", status_code=status.HTTP_200_OK)
async def get_workflow_templates(
    db: AsyncSession = Depends(get_session),
    _user: AuthenticatedUser = Depends(get_authenticated_user)
) -> list[WorkflowTemplateMetadata]:
    result = await db.exec(
        select(WorkflowTemplateMetadata)
    )
    return result.all()


@router.post("/templates/import/{workflow_id}", status_code=status.HTTP_201_CREATED)
async def import_workflow_template(
    workflow_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> str:
    template_workflow = await get_workflow_impl(workflow_id, db, None, True)

    # 1) Insert into workflow table
    new_workflow = Workflow(
        workflow_name=template_workflow.workflow_name,
        workflow_description=template_workflow.workflow_description,
        is_live=False,
        user_id=user.user_id
    )
    db.add(new_workflow)
    await db.flush()

    # 2) Copy from action_node table and generate webhook secrets
    template_action_id_to_new_action_id = {}

    for action in template_workflow.actions:
        # Copy action and replace IDs
        new_action = ActionNode(
            workflow_id=new_workflow.workflow_id,
            action_name=action.action_name,
            reference_handle=action.reference_handle,
            action_type=action.action_type,
            action_description=action.action_description,
            x_position=action.x_position,
            y_position=action.y_position,
            action_definition=action.action_definition
        )

        db.add(new_action)
        await db.flush()

        if action.action_type == ActionType.WEBHOOK:
            # Generate a new webhook
            webhook_id = uuid.uuid4()
            webhook_secret = hmac.new(settings.WEBHOOK_SIGNING_SECRET.encode(), webhook_id.bytes, hashlib.sha256)
            webhook_secret = webhook_secret.hexdigest()

            webhook = Webhook(
                webhook_id=webhook_id,
                webhook_secret=webhook_secret,
                action_id=new_action.action_id,
            )
            db.add(webhook)
            await db.flush()

        template_action_id_to_new_action_id[action.action_id] = new_action.action_id

    # 3) Copy from workflow_edge table
    for edge in template_workflow.edges:
        new_edge = WorkflowEdge(
            parent_action_id=template_action_id_to_new_action_id[edge.parent_action_id],
            child_action_id=template_action_id_to_new_action_id[edge.child_action_id],
            edge_type=edge.edge_type,
            parent_node_handle=edge.parent_node_handle,
            child_node_handle=edge.child_node_handle,
            workflow_id=new_workflow.workflow_id
        )

        db.add(new_edge)
        await db.flush()

    await db.commit()

    return new_workflow.workflow_id


class WorkflowRunEntry(BaseModel):
    run_id: str
    started_at: datetime
    completed_at: Optional[datetime]
    action_state_count: int


@router.get("/{workflow_id}/runs", status_code=status.HTTP_200_OK)
async def get_workflow_runs(
    workflow_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> list[WorkflowRunEntry]:
    # get all run_ids together with the started timestamp and sort by started timestamp in DESC order
    result = await db.exec(
        select(
                WorkflowRun,
                func.count(WorkflowRunActionState.action_state_id).label("action_state_count")                
            )
            .join(Workflow)
            .join(WorkflowRunActionState)
            .where(WorkflowRun.workflow_id == workflow_id)
            .where(Workflow.user_id == user.user_id)
            .group_by(WorkflowRun)
            .order_by(WorkflowRun.started_timestamp.desc())
    )
    workflow_runs = result.all()
    return list(
        map(
            lambda run: WorkflowRunEntry(
                run_id=run.WorkflowRun.run_id,
                started_at=run.WorkflowRun.started_timestamp,
                completed_at=run.WorkflowRun.completed_timestamp,
                action_state_count=run.action_state_count
            ),
            workflow_runs
        )
    )


class WorkflowRunEvent(BaseModel):
    action_state_id: str
    created_at: datetime
    action_name: str
    action_type: ActionType
    action_state: dict
    prev_action_state_id: Optional[str]


@router.get("/{workflow_id}/runs/{run_id}", status_code=status.HTTP_200_OK)
async def get_workflow_run_events(
    workflow_id: str,
    run_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> list[WorkflowRunEvent]:
    await raise_if_workflow_not_exists_for_user(db, workflow_id, user.user_id)

    result = await db.exec(
        select(WorkflowRunActionState, ActionNode)
            .join(ActionNode)
            .join(WorkflowRun)
            .where(WorkflowRun.workflow_id == workflow_id)
            .where(WorkflowRun.run_id == run_id)
            .order_by(WorkflowRunActionState.created_at.asc())
    )
    action_states = result.all()

    return list(
        map(
            lambda action_state: WorkflowRunEvent(
                action_state_id=action_state.WorkflowRunActionState.action_state_id,
                created_at=action_state.WorkflowRunActionState.created_at,
                action_name=action_state.ActionNode.action_name,
                action_type=action_state.ActionNode.action_type,
                action_state=action_state.WorkflowRunActionState.action_state,
                prev_action_state_id=action_state.WorkflowRunActionState.prev_action_state_id
            ),
            action_states
        )
    )
