from fastapi.security.api_key import APIKeyHeader
from fastapi import Depends, HTTPException, status, Security
from jose import jwt, JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.config import settings
from app.db import get_session
from app.models import AuthenticatedUser, UserProfile


api_key_header = APIKeyHeader(name="Authorization", auto_error=False)


async def get_authenticated_user(api_key: str | None = Security(api_key_header), session: AsyncSession = Depends(get_session)) -> AuthenticatedUser:
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
            user_id,
            email,
            role
        )
    except JWTError:
        raise credentials_exception

    # check whether the user exists in user_profile
    results = await session.exec(select(UserProfile).where(UserProfile.user_id == user.user_id).limit(1))
    user_profiles = results.all()

    if len(user_profiles) != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not exist"
        )

    if not user_profiles[0].email_confirmed_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not confirmed"
        )

    return user
