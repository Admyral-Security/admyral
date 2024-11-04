from pydantic import BaseModel

from admyral.utils.singleton import Singleton


class SecretRegistry(metaclass=Singleton):
    _secrets: dict[str, BaseModel] = {}

    @classmethod
    def register_secret(cls, secret_type: str, secret: BaseModel) -> None:
        if secret_type in cls._secrets:
            raise ValueError(f"Secret with type '{secret_type}' already exists")
        cls._secrets[secret_type] = secret

    @classmethod
    def get_secret_schemas(cls) -> dict[str, list[str]]:
        return {
            secret_type: secret.model_json_schema()["properties"].keys()
            for secret_type, secret in cls._secrets.items()
        }

    @classmethod
    def is_registered(cls, secret_type: str) -> bool:
        return secret_type in cls._secrets


# needs to be defined after SecretRegistry, such that SecretRegistry is fully defined
# before any action is registered
from admyral.actions import *  # noqa: E402,F403
