from fastapi import APIRouter, status, HTTPException, Depends
from fastapi.responses import StreamingResponse
import json
import io

from admyral.server.auth import authenticate
from admyral.models import (
    AuthenticatedUser,
    WorkflowRunMetadata,
    WorkflowRunStepMetadata,
    WorkflowRunStepWithSerializedResult,
)
from admyral.server.deps import get_admyral_store


router = APIRouter()


MAX_SERIALIZED_RESULT_LENGTH = 10_000


@router.get("/{workflow_id}", status_code=status.HTTP_200_OK)
async def list_workflow_runs(
    workflow_id: str,
    limit: int | None = 100,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[WorkflowRunMetadata]:
    """
    List all workflow runs.

    Args:
        workflow_id: The workflow id

    Returns:
        A list of workflow runs.
    """
    return await get_admyral_store().list_workflow_runs(
        authenticated_user.user_id, workflow_id, limit=limit
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
) -> WorkflowRunStepWithSerializedResult:
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

    serialized_result = json.dumps(step.result, indent=4)
    if len(serialized_result) > MAX_SERIALIZED_RESULT_LENGTH:
        serialized_result = (
            serialized_result[:MAX_SERIALIZED_RESULT_LENGTH]
            + "...\nResult truncated because it is too long."
        )
    return WorkflowRunStepWithSerializedResult.model_validate(
        {
            **step.model_dump(),
            "result": serialized_result,
        }
    )


@router.get(
    "/{workflow_id}/{workflow_run_id}/{workflow_run_step_id}/download",
    status_code=status.HTTP_200_OK,
)
async def download_workflow_run_step_result(
    workflow_id: str,
    workflow_run_id: str,
    workflow_run_step_id: str,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> StreamingResponse:
    """
    Download the full result of a workflow run step.

    Args:
        workflow_id: The workflow id
        workflow_run_id: The workflow run id
        workflow_run_step_id: The workflow run step id

    Returns:
        The complete result as a downloadable JSON file.
    """
    step = await get_admyral_store().get_workflow_run_step(
        authenticated_user.user_id, workflow_id, workflow_run_id, workflow_run_step_id
    )
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    # Convert to JSON and create a string buffer
    json_str = json.dumps(step.result, indent=4)
    json_bytes = json_str.encode("utf-8")

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="step_result_{workflow_run_step_id}.json"'
        },
    )
