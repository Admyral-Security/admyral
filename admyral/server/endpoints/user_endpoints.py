from fastapi import APIRouter, status, Depends

from admyral.server.auth import authenticate
from admyral.models import AuthenticatedUser, UserProfile
from admyral.server.deps import get_admyral_store


router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def get_user_profile(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> UserProfile:
    return UserProfile(email=authenticated_user.email)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_profile(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> None:
    await get_admyral_store().delete_user(authenticated_user.user_id)
