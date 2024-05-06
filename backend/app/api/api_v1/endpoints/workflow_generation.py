from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel

from app.deps import AuthenticatedUser, get_authenticated_user, get_session
from app.core.workflow_generation import generate_workflow, Action, Connection
from app.models import WorkflowGeneration
from app.config import settings
from app.shared_queries import count_workflow_generations_last_24h


router = APIRouter()


class WorkflowGenerationRequest(BaseModel):
    user_input: str


class WorkflowGenerationResponse(BaseModel):
    actions: list[Action]
    connections: list[Connection]


@router.post(
    "/generate",
    status_code=status.HTTP_200_OK
)
async def generate(
    request: WorkflowGenerationRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> WorkflowGenerationResponse:
    if settings.WORKFLOW_ASSISTANT_DAILY_QUOTA is not None:
        generations_count_last_24h = await count_workflow_generations_last_24h(user.user_id, db)
        if generations_count_last_24h >= settings.WORKFLOW_ASSISTANT_DAILY_QUOTA:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Quota limit exceeded"
            )

    workflow_generation_result = await generate_workflow(request.user_input)

    if workflow_generation_result.is_error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error: Could not generate workflow."
        )

    db.add(WorkflowGeneration(
        user_id=user.user_id,
        user_input=request.user_input,
        generated_actions=list(map(lambda action: action.model_dump(), workflow_generation_result.actions)),
        generated_edges=list(map(lambda connection: connection.model_dump(), workflow_generation_result.connections)),
        total_tokens=workflow_generation_result.total_tokens,
        prompt_tokens=workflow_generation_result.prompt_tokens,
        completion_tokens=workflow_generation_result.completion_tokens
    ))
    await db.commit()

    return WorkflowGenerationResponse(
        actions=workflow_generation_result.actions,
        connections=workflow_generation_result.connections
    )
