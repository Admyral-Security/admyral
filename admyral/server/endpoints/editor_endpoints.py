from fastapi import APIRouter, status, HTTPException
from collections import defaultdict
from sqlalchemy.exc import IntegrityError

from admyral.action_registry import ActionRegistry
from admyral.server.deps import get_admyral_store
from admyral.models import (
    ActionMetadata,
    ActionNamespace,
    EditorActions,
    EditorWorkflowGraph,
    WorkflowPushRequest,
    WorkflowPushResponse,
)
from admyral.editor import (
    workflow_to_editor_workflow_graph,
    editor_workflow_graph_to_workflow,
)
from admyral.server.endpoints.workflow_endpoints import push_workflow_impl


router = APIRouter()


@router.get("/actions", status_code=status.HTTP_200_OK)
async def load_workflow_actions() -> EditorActions:
    """
    Load all available workflow actions.
    """
    actions = [action.to_metadata() for action in ActionRegistry.get_actions()]
    custom_actions = await get_admyral_store().list_actions()
    actions.extend(custom_actions)

    actions_by_namespace = defaultdict(list)
    for action in actions:
        actions_by_namespace[action.display_namespace].append(action)

    # TODO: implement other control flow actions
    control_flow_actions = [
        # ActionMetadata(
        #     action_type="transform",
        #     display_name="Transform",
        #     display_namespace="Control Flow",
        # ),
        ActionMetadata(
            action_type="if_condition",
            display_name="If Condition",
            display_namespace="Control Flow",
        ),
        # ActionMetadata(
        #     action_type="python",
        #     display_name="Python",
        #     display_namespace="Control Flow",
        # ),
        # ActionMetadata(action_type="for_loop", display_name="For Loop"),
        # ActionMetadata(
        #     action_type="note",
        #     display_name="Note",
        #     display_namespace="Control Flow",
        # ),
    ]

    return EditorActions(
        control_flow_actions=control_flow_actions,
        namespaces=[
            ActionNamespace(namespace=namespace, actions=actions)
            for namespace, actions in actions_by_namespace.items()
        ],
    )


@router.get("/workflow", status_code=status.HTTP_200_OK)
async def load_workflow_as_react_flow_graph(workflow_id: str) -> EditorWorkflowGraph:
    """
    Load a workflow as a ReactFlow graph.
    """
    workflow = await get_admyral_store().get_workflow_by_id(workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Workflow with the ID "{workflow_id}" does not exist.',
        )
    webhook = await get_admyral_store().get_webhook_for_workflow(workflow_id)
    return workflow_to_editor_workflow_graph(
        workflow,
        webhook_id=webhook.webhook_id if webhook else None,
        webhook_secret=webhook.webhook_secret if webhook else None,
    )


# TODO: TEST UNIQUENESS CONSTRAINT REGARDING WORKFLOW NAME
@router.post("/workflow", status_code=status.HTTP_201_CREATED)
async def save_workflow_from_react_flow_graph(
    editor_workflow_graph: EditorWorkflowGraph,
) -> WorkflowPushResponse:
    """
    Save a workflow from a ReactFlow graph.
    """
    workflow = editor_workflow_graph_to_workflow(editor_workflow_graph)
    try:
        return await push_workflow_impl(
            workflow_name=workflow.workflow_name,
            workflow_id=workflow.workflow_id,
            request=WorkflowPushRequest(
                workflow_dag=workflow.workflow_dag, activate=workflow.is_active
            ),
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A workflow with the name '{workflow.workflow_name}' already exists. Workflow names must be unique.",
        )
