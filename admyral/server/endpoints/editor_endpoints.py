from fastapi import APIRouter, status, HTTPException, Depends
from collections import defaultdict
import re

from admyral.action_registry import ActionRegistry
from admyral.server.deps import get_admyral_store
from admyral.models import (
    AuthenticatedUser,
    ActionMetadata,
    ActionNamespace,
    EditorActions,
    EditorWorkflowGraph,
    WorkflowPushResponse,
)
from admyral.editor import (
    workflow_to_editor_workflow_graph,
    editor_workflow_graph_to_workflow,
)
from admyral.server.endpoints.workflow_endpoints import push_workflow_impl
from admyral.server.auth import authenticate
from admyral.compiler.yaml_workflow_compiler import validate_workflow


VALID_WORKFLOW_NAME_REGEX = re.compile(r"^[a-zA-Z][a-zA-Z0-9 _]*$")
SNAKE_CASE_REGEX = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


ADMYRAL_NAMESPACE = "Admyral"


router = APIRouter()


@router.get("/actions", status_code=status.HTTP_200_OK)
async def load_workflow_actions(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> EditorActions:
    """
    Load all available workflow actions.
    """
    actions = [action.to_metadata() for action in ActionRegistry.get_actions()]
    custom_actions = await get_admyral_store().list_actions(
        user_id=authenticated_user.user_id
    )
    actions.extend(custom_actions)

    actions_by_namespace = defaultdict(list)
    for action in actions:
        actions_by_namespace[action.display_namespace].append(action)

    control_flow_actions = [
        ActionMetadata(
            action_type="if_condition",
            display_name="If Condition",
            display_namespace=ADMYRAL_NAMESPACE,
        ),
        # ActionMetadata(
        #     action_type="python",
        #     display_name="Python",
        #     display_namespace="Admyral",
        # ),
        # ActionMetadata(action_type="for_loop", display_name="For Loop"),
        # ActionMetadata(
        #     action_type="note",
        #     display_name="Note",
        #     display_namespace="Admyral",
        # ),
    ]
    for control_flow_action in control_flow_actions:
        actions_by_namespace[ADMYRAL_NAMESPACE].append(control_flow_action)

    admyral_namespace_actions = actions_by_namespace.pop(ADMYRAL_NAMESPACE, [])
    namespaces = [
        ActionNamespace(namespace=namespace, actions=actions)
        for namespace, actions in actions_by_namespace.items()
    ]
    namespaces = [
        ActionNamespace(namespace=ADMYRAL_NAMESPACE, actions=admyral_namespace_actions)
    ] + sorted(namespaces, key=lambda namespace: namespace.namespace)

    return EditorActions(namespaces=namespaces)


@router.get("/workflow", status_code=status.HTTP_200_OK)
async def load_workflow_as_react_flow_graph(
    workflow_id: str, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> EditorWorkflowGraph:
    """
    Load a workflow as a ReactFlow graph.
    """
    workflow = await get_admyral_store().get_workflow_by_id(
        user_id=authenticated_user.user_id, workflow_id=workflow_id
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Workflow with the ID "{workflow_id}" does not exist.',
        )
    webhook = await get_admyral_store().get_webhook_for_workflow(
        user_id=authenticated_user.user_id, workflow_id=workflow_id
    )
    return workflow_to_editor_workflow_graph(
        workflow,
        webhook_id=webhook.webhook_id if webhook else None,
        webhook_secret=webhook.webhook_secret if webhook else None,
    )


@router.post("/workflow", status_code=status.HTTP_201_CREATED)
async def save_workflow_from_react_flow_graph(
    editor_workflow_graph: EditorWorkflowGraph,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> WorkflowPushResponse:
    """
    Save a workflow from a ReactFlow graph.
    """
    workflow = editor_workflow_graph_to_workflow(editor_workflow_graph)
    return await push_workflow_impl(
        user_id=authenticated_user.user_id,
        workflow_name=workflow.workflow_name,
        workflow_id=workflow.workflow_id,
        workflow_dag=workflow.workflow_dag,
        activate=workflow.is_active,
    )


@router.post("/workflow/create", status_code=status.HTTP_204_NO_CONTENT)
async def create_workflow_from_react_flow_graph(
    editor_workflow_graph: EditorWorkflowGraph,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> None:
    """
    Create a new workflow from a ReactFlow graph.
    """
    store = get_admyral_store()

    workflow = editor_workflow_graph_to_workflow(editor_workflow_graph)
    try:
        await validate_workflow(
            authenticated_user.user_id, store, workflow.workflow_dag
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    try:
        await store.create_workflow(
            user_id=authenticated_user.user_id, workflow=workflow
        )
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A workflow with the name '{workflow.workflow_name}' already exists. Workflow names must be unique.",
            )
        else:
            raise e
