from pydantic import BaseModel
from datetime import datetime


class AuthenticatedUser(BaseModel):
    user_id: str
    email: str | None = None


class User(BaseModel):
    id: str
    name: str | None
    email: str
    email_verified: datetime | None
    image: str | None
    created_at: datetime
    updated_at: datetime
