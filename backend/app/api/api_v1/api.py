from fastapi import APIRouter

from app.api.api_v1.endpoints import credential, user_profile, workflow, workflow_generation


api_router = APIRouter()
api_router.include_router(credential.router, prefix="/credentials")
api_router.include_router(workflow.router, prefix="/workflows")
api_router.include_router(user_profile.router, prefix="/profile")
api_router.include_router(workflow_generation.router, prefix="/workflow-generation")
