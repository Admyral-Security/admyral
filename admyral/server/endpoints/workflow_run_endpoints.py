from fastapi import APIRouter, status, HTTPException, Depends

from admyral.server.auth import authenticate
from admyral.models import (
    AuthenticatedUser,
    WorkflowRunMetadata,
    WorkflowRunStepMetadata,
    WorkflowRunStep,
)
from admyral.server.deps import get_admyral_store


router = APIRouter()


@router.get("/{workflow_id}", status_code=status.HTTP_200_OK)
async def list_workflow_runs(
    workflow_id: str, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> list[WorkflowRunMetadata]:
    """
    List all workflow runs.

    Args:
        workflow_id: The workflow id

    Returns:
        A list of workflow runs.
    """
    return await get_admyral_store().list_workflow_runs(
        authenticated_user.user_id, workflow_id
    )


@router.get("/{workflow_id}/{workflow_run_id}", status_code=status.HTTP_200_OK)
async def get_workflow_run_steps(
    workflow_id: str,
    workflow_run_id: str,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[WorkflowRunStepMetadata]:
    """
    Get workflow runs by workflow id.

    Args:
        workflow_id: The workflow id
        workflow_run_id: The workflow run id

    Returns:
        A list of workflow run steps.
    """
    return await get_admyral_store().list_workflow_run_steps(
        authenticated_user.user_id, workflow_id, workflow_run_id
    )


@router.get(
    "/{workflow_id}/{workflow_run_id}/{workflow_run_step_id}",
    status_code=status.HTTP_200_OK,
)
async def get_workflow_run_step(
    workflow_id: str,
    workflow_run_id: str,
    workflow_run_step_id: str,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> WorkflowRunStep:
    """
    Get workflow run step.

    Args:
        workflow_id: The workflow id
        workflow_run_id: The workflow run id
        workflow_run_step_id: The workflow run step id

    Returns:
        The workflow run step.
    """
    step = await get_admyral_store().get_workflow_run_step(
        authenticated_user.user_id, workflow_id, workflow_run_id, workflow_run_step_id
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step
