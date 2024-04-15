from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from pydantic import BaseModel

from app.deps import AuthenticatedUser, get_authenticated_user, get_session
from app.models import UserProfile


router = APIRouter()


async def query_user_profile(user_id: int, db: AsyncSession) -> UserProfile:
    result = await db.exec(select(UserProfile).where(UserProfile.user_id == user_id).limit(1))
    user_profile = result.one_or_none()
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found."
        )
    return user_profile


class UserProfileResponse(BaseModel):
    first_name: str
    last_name: str
    company: str
    email: str


@router.get(
    "/{user_id}",
    status_code=status.HTTP_200_OK
)
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> UserProfileResponse:
    if user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are not authorized to view this user's profile."
        )

    user = await query_user_profile(user_id, db)

    return UserProfileResponse(
        first_name=user.first_name,
        last_name=user.last_name,
        company=user.company,
        email=user.email
    )


class UserProfileUpdateRequest(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    company: Optional[str]
    email: Optional[str]


@router.post("/{user_id}/update", status_code=status.HTTP_204_NO_CONTENT)
async def update_user_profile(
    user_id: str,
    request: UserProfileUpdateRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    if user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are not authorized to view this user's profile."
        )

    user_profile = await query_user_profile(user_id, db)

    if request.first_name:
        user_profile.first_name = request.first_name
    if request.last_name:
        user_profile.last_name = request.last_name
    if request.company:
        user_profile.company = request.company
    if request.email:
        user_profile.email = request.email
    
    db.add(user_profile)
    await db.commit()


@router.post("/{user_id}/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    if user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are not authorized to view this user's profile."
        )

    user_profile = await query_user_profile(user_id, db)

    await db.delete(user_profile)
    await db.commit()
