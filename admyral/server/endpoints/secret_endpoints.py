from fastapi import APIRouter, status, Depends

from admyral.server.auth import authenticate
from admyral.models import (
    Secret,
    SecretMetadata,
    DeleteSecretRequest,
    AuthenticatedUser,
)
from admyral.server.deps import get_secrets_manager


router = APIRouter()


@router.post("/set", status_code=status.HTTP_204_NO_CONTENT)
async def set_secret(
    secret: Secret, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> None:
    await get_secrets_manager().set(authenticated_user.user_id, secret)


@router.get("/list", status_code=status.HTTP_200_OK)
async def list_secrets(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[SecretMetadata]:
    return await get_secrets_manager().list(user_id=authenticated_user.user_id)


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(
    request: DeleteSecretRequest,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> None:
    await get_secrets_manager().delete(
        user_id=authenticated_user.user_id, secret_id=request.secret_id
    )
