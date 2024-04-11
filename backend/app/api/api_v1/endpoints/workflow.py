from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.deps import AuthenticatedUser, get_authenticated_user, get_session


router = APIRouter()

@router.post("/create")
async def create_workflow(db: AsyncSession = Depends(get_session), user: AuthenticatedUser = Depends(get_authenticated_user)) -> Any:
    # TODO:
    return None


# TODO: ...
