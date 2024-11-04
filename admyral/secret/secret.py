from pydantic import BaseModel


def register_secret(secret_type: str) -> BaseModel:
    def inner(secret: BaseModel) -> BaseModel:
        from admyral.secret.secret_registry import SecretRegistry

        SecretRegistry.register_secret(secret_type, secret)
        return secret

    return inner
