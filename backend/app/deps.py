from fastapi.security.api_key import APIKeyHeader
from fastapi import Depends, HTTPException, status, Security
from jose import jwt, JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select
from pydantic import BaseModel

from app.config import settings
from app.db import engine
from app.models import UserProfile


async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


api_key_header = APIKeyHeader(name="Authorization", auto_error=False)


class AuthenticatedUser(BaseModel):
    user_id: str
    email: str
    role: str


async def get_authenticated_user(
    api_key: str | None = Security(api_key_header),
    session: AsyncSession = Depends(get_session)
) -> AuthenticatedUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not api_key:
        raise credentials_exception
    
    if not api_key.startswith("Bearer "):
        raise credentials_exception
    
    token = api_key.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False}
        )
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")
        if not user_id or not email or not role:
            raise credentials_exception

        user = AuthenticatedUser(
            user_id=user_id,
            email=email,
            role=role
        )
    except JWTError:
        raise credentials_exception

    # check whether the user exists in user_profile
    results = await session.exec(select(UserProfile).where(UserProfile.user_id == user.user_id).limit(1))
    user_profile = results.one_or_none()

    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not exist"
        )

    if not user_profile.email_confirmed_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not confirmed"
        )

    return user
