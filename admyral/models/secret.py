from pydantic import BaseModel


class EncryptedSecret(BaseModel):
    secret_id: str
    encrypted_secret: str
    secret_schema: list[str]


class Secret(BaseModel):
    secret_id: str
    secret: dict[str, str]


class SecretMetadata(BaseModel):
    secret_id: str
    secret_schema: list[str]


class DeleteSecretRequest(BaseModel):
    secret_id: str
