from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from app.deps import AuthenticatedUser, get_authenticated_user, get_session
from app.models import Credential 


router = APIRouter()


# TODO: add update functionality


class CredentialCreateRequest(BaseModel):
    credential_name: str
    encrypted_secret: str


@router.post(
    "/create",
    status_code=status.HTTP_201_CREATED,
)
async def create_credential(
    request: CredentialCreateRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> str:
    new_credential = Credential(
        user_id=user.user_id,
        credential_name=request.credential_name,
        encrypted_secret=request.encrypted_secret
    )

    try:
        db.add(new_credential)
        await db.commit()
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insert is violating constraints."
        )

    return "success"


class CredentialDeleteRequest(BaseModel):
    credential_name: str


@router.post(
    "/delete",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_credential(
    request: CredentialDeleteRequest,
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
):
    result = await db.exec(
        select(Credential)
        .where(Credential.user_id == user.user_id and Credential.credential_name == request.credential_name)
        .limit(1)
    )
    existing_credential = result.one_or_none()
    if not existing_credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )

    await db.delete(existing_credential)
    await db.commit()


@router.get(
    "/",
    status_code=status.HTTP_200_OK
)
async def list_credentials(
    db: AsyncSession = Depends(get_session),
    user: AuthenticatedUser = Depends(get_authenticated_user)
) -> list[str]:
    result = await db.exec(
        select(Credential)
        .where(Credential.user_id == user.user_id)
    )
    credentials = result.all()
    return list(map(lambda credential: credential.credential_name, credentials))
