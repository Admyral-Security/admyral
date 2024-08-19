from fastapi import APIRouter, status, HTTPException

from admyral.models import WorkflowRunMetadata, WorkflowRunStepMetadata, WorkflowRunStep
from admyral.server.deps import get_admyral_store


router = APIRouter()


@router.get("/{workflow_id}", status_code=status.HTTP_200_OK)
async def list_workflow_runs(workflow_id: str) -> list[WorkflowRunMetadata]:
    """
    List all workflow runs.

    Args:
        workflow_id: The workflow id

    Returns:
        A list of workflow runs.
    """
    return await get_admyral_store().list_workflow_runs(workflow_id)


@router.get("/{workflow_id}/{workflow_run_id}", status_code=status.HTTP_200_OK)
async def get_workflow_run_steps(
    workflow_id: str, workflow_run_id: str
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
        workflow_id, workflow_run_id
    )


@router.get(
    "/{workflow_id}/{workflow_run_id}/{workflow_run_step_id}",
    status_code=status.HTTP_200_OK,
)
async def get_workflow_run_step(
    workflow_id: str, workflow_run_id: str, workflow_run_step_id: str
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
        workflow_id, workflow_run_id, workflow_run_step_id
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step
