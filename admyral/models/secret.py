from pydantic import BaseModel
from datetime import datetime


class EncryptedSecret(BaseModel):
    secret_id: str
    encrypted_secret: str
    secret_schema: list[str]
    secret_type: str | None


class Secret(BaseModel):
    secret_id: str
    secret: dict[str, str]
    secret_type: str | None = None


class SecretMetadata(BaseModel):
    secret_id: str
    secret_schema: list[str]
    email: str
    created_at: datetime
    updated_at: datetime
    secret_type: str | None


class DeleteSecretRequest(BaseModel):
    secret_id: str
