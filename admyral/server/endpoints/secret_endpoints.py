from fastapi import APIRouter, status, Depends

from admyral.server.auth import authenticate
from admyral.models import (
    Secret,
    SecretMetadata,
    DeleteSecretRequest,
    AuthenticatedUser,
)
from admyral.server.deps import get_secrets_manager
from admyral.secret.secret_registry import SecretRegistry


def handle_secret_values(secret_key_values: dict[str, str]) -> dict[str, str]:
    return dict(
        [
            (key, val.encode("utf-8").decode("unicode_escape"))
            for key, val in secret_key_values.items()
        ]
    )


router = APIRouter()


@router.post("/set", status_code=status.HTTP_201_CREATED)
async def set_secret(
    secret: Secret, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> SecretMetadata:
    secret.secret = handle_secret_values(secret.secret)
    return await get_secrets_manager().set(authenticated_user.user_id, secret)


@router.post("/update", status_code=status.HTTP_200_OK)
async def update_secret(
    secret: Secret, authenticated_user: AuthenticatedUser = Depends(authenticate)
) -> SecretMetadata:
    secret.secret = handle_secret_values(secret.secret)
    return await get_secrets_manager().update(authenticated_user.user_id, secret)


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


@router.get("/schemas")
async def get_secret_schemas(
    _authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[tuple[str, list[str]]]:
    schemas = SecretRegistry.get_secret_schemas()
    schemas = list(schemas.items())
    return sorted(schemas, key=lambda x: x[0])
