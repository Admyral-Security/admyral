from fastapi import APIRouter

from app.api.api_v1.endpoints import credential, workflow


api_router = APIRouter()
api_router.include_router(credential.router, prefix="/credentials")
api_router.include_router(workflow.router, prefix="/workflows")
