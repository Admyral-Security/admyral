from fastapi import Request, HTTPException
from fastapi_nextauth_jwt import NextAuthJWTv4

from admyral.models.auth import AuthenticatedUser
from admyral.config.config import CONFIG, DISABLE_AUTH, AUTH_SECRET, ADMYRAL_ENV
from admyral.server.deps import get_admyral_store
from admyral.logger import get_logger


logger = get_logger(__name__)


JWT = NextAuthJWTv4(
    secret=AUTH_SECRET, csrf_prevention_enabled=False if ADMYRAL_ENV == "dev" else True
)


def validate_and_decrypt_jwt(request: Request) -> dict:
    return JWT(request)


async def authenticate(request: Request) -> AuthenticatedUser:
    if DISABLE_AUTH:
        return AuthenticatedUser(user_id=CONFIG.default_user_id)

    # extract user id from authentication method
    if "x-api-key" in request.headers:
        user_id = await get_admyral_store().search_api_key_owner(
            request.headers["x-api-key"]
        )
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid API Key")
    else:
        try:
            decrypted_token = validate_and_decrypt_jwt(request)
        except Exception as e:
            logger.error(f"Failed to validate token: {e}")
            raise HTTPException(status_code=401, detail="Invalid or missing token")
        user_id = decrypted_token.get("sub") or decrypted_token.get("id")

    if not user_id:
        # Missing user id
        raise HTTPException(status_code=401, detail="Invalid token")

    # check user for existance in the database
    user = await get_admyral_store().get_user(user_id)
    if not user:
        # User not found
        raise HTTPException(status_code=401, detail="Invalid token")

    return AuthenticatedUser(user_id=user_id)
