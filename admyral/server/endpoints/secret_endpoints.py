from fastapi import APIRouter, status

from admyral.models import Secret, SecretMetadata, DeleteSecretRequest
from admyral.server.deps import get_secrets_manager
from admyral.config.config import GlobalConfig


router = APIRouter()


@router.post("/set", status_code=status.HTTP_204_NO_CONTENT)
async def set_secret(secret: Secret) -> None:
    user_id = GlobalConfig().user_id  # TODO: user_id from token
    await get_secrets_manager().set(user_id, secret)


@router.get("/list", status_code=status.HTTP_200_OK)
async def list_secrets() -> list[SecretMetadata]:
    user_id = GlobalConfig().user_id  # TODO: user_id from token
    return await get_secrets_manager().list(user_id)


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(request: DeleteSecretRequest) -> None:
    user_id = GlobalConfig().user_id  # TODO: user_id from token
    await get_secrets_manager().delete(user_id, request.secret_id)
