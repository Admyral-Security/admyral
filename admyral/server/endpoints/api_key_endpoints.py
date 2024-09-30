from fastapi import APIRouter, status, Depends
from pydantic import BaseModel

from admyral.server.auth import authenticate
from admyral.models import AuthenticatedUser, ApiKey
from admyral.server.deps import get_admyral_store
from admyral.utils.api_key import generate_api_key


router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def list_api_keys(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[ApiKey]:
    return await get_admyral_store().list_api_keys(authenticated_user.user_id)


class CreateApiKeyRequest(BaseModel):
    name: str


class CreateApiKeyResponse(BaseModel):
    key: ApiKey
    secret: str


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateApiKeyRequest,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> CreateApiKeyResponse:
    secret_key = generate_api_key()
    api_key = await get_admyral_store().store_api_key(
        authenticated_user.user_id, request.name, secret_key
    )
    return CreateApiKeyResponse(key=api_key, secret=secret_key)


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: str,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> None:
    await get_admyral_store().delete_api_key(authenticated_user.user_id, api_key_id)
