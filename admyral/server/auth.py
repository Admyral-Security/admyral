from fastapi import Request, HTTPException
from fastapi_nextauth_jwt import NextAuthJWT
import os

from admyral.models.auth import AuthenticatedUser
from admyral.config.config import GlobalConfig, DISABLE_AUTH, AUTH_SECRET
from admyral.server.deps import get_admyral_store


"""
Environment variables:
- ENV
- NEXTAUTH_SECRET => AUTH_SECRET as arg.
- NEXTAUTH_URL
"""
JWT = NextAuthJWT(
    secret=AUTH_SECRET,
)


def validate_and_decrypt_jwt(request: Request) -> dict:
    return JWT(request)


async def authenticate(request: Request) -> AuthenticatedUser:
    if DISABLE_AUTH:
        return AuthenticatedUser(user_id=GlobalConfig().user_id)

    # extract user id from authentication method
    if "x-api-key" in request.headers:
        api_key = await get_admyral_store().search_api_key(request.headers["x-api-key"])
        if not api_key:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        user_id = api_key.user_id
    else:
        assert os.environ.get("AUTH_SECRET") is not None, "AUTH_SECRET must be set"
        decrypted_token = validate_and_decrypt_jwt(request)
        user_id = decrypted_token.get("sub")

    if not user_id:
        # Missing user id
        raise HTTPException(status_code=401, detail="Invalid token")

    # check user for existance in the database
    user = await get_admyral_store().get_user(user_id)
    if not user:
        # User not found
        raise HTTPException(status_code=401, detail="Invalid token")

    return AuthenticatedUser(user_id=user_id)
