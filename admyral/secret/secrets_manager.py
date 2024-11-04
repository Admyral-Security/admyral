from abc import abstractmethod
from typing import Optional
import json

from admyral.db.store_interface import StoreInterface
from admyral.utils.crypto import decrypt_secret, encrypt_secret
from admyral.models import Secret, SecretMetadata
from admyral.config.config import CONFIG, SecretsManagerType
from admyral.utils.collections import is_empty
from admyral.secret.secret_registry import SecretRegistry


class SecretsManager:
    @abstractmethod
    async def get(self, user_id: str, secret_id: str) -> Optional[Secret]:
        """
        Retrieve a secret for a user. If the secret does not exist, return None.

        Args:
            user_id: The user id of the user whose secret is retrieved.
            secret_id: The id of the secret to retrieve.
        """
        raise NotImplementedError("get method not implemented")

    @abstractmethod
    async def update(self, user_id: str, delta_secret: Secret) -> SecretMetadata:
        """
        Update a secret for a user. If the secret does not exist, raise a ValueError.

        Fields with an empty value are ignored and not updated.

        Args:
            user_id: The user id of the user whose secret is updated.
            delta_secret: The secret to update.
        """
        raise NotImplementedError("update method not implemented")

    @abstractmethod
    async def set(self, user_id: str, secret: Secret) -> SecretMetadata:
        """
        Set a secret for a user. If the secret already exists, it is overwritten.
        The function takes care of encrypting the secret.

        Args:
            user_id: The user id of the user whose secret is set.
            secret: The secret to set.
        """
        raise NotImplementedError("set method not implemented")

    @abstractmethod
    async def delete(self, user_id: str, secret_id: str) -> None:
        """
        Delete a secret for a user.

        Args:
            user_id: The user id of the user whose secret is deleted.
            secret_id: The id of the secret to delete.
        """
        raise NotImplementedError("delete method not implemented")

    @abstractmethod
    async def list(self, user_id: str) -> list[SecretMetadata]:
        """
        List the secret names for a user.

        Args:
            user_id: The user id of the user whose secrets are listed.
        """
        raise NotImplementedError("list method not implemented")


class SQLSecretsManager(SecretsManager):
    def __init__(self, db: StoreInterface) -> None:
        self.db = db

    async def get(self, user_id: str, secret_id: str) -> Secret:
        encrypted_secret = await self.db.get_secret(user_id, secret_id)
        return (
            Secret(
                secret_id=secret_id,
                secret=json.loads(decrypt_secret(encrypted_secret.encrypted_secret)),
            )
            if encrypted_secret
            else None
        )

    async def update(self, user_id: str, delta_secret: Secret) -> SecretMetadata:
        secret = await self.get(user_id, delta_secret.secret_id)
        if not secret:
            raise ValueError(f"Secret {delta_secret.secret_id} does not exist")

        for key, value in delta_secret.secret.items():
            if is_empty(value):
                continue
            secret.secret[key] = value

        # remove the keys which are not present
        # we only allow editing the schema if the secret type is not valid
        if not SecretRegistry.is_registered(delta_secret.secret_type):
            removal_keys = set(secret.secret.keys()) - set(delta_secret.secret.keys())
            for key in removal_keys:
                secret.secret.pop(key)

        return await self.set(user_id, secret)

    async def set(self, user_id: str, secret: Secret) -> SecretMetadata:
        serialized_secret = json.dumps(secret.secret)
        encrypted_secret = encrypt_secret(serialized_secret)
        secret_schema = list(secret.secret.keys())
        return await self.db.store_secret(
            user_id,
            secret.secret_id,
            encrypted_secret,
            secret_schema,
            secret.secret_type,
        )

    async def delete(self, user_id: str, secret_id: str) -> None:
        return await self.db.delete_secret(user_id, secret_id)

    async def list(self, user_id: str) -> list[SecretMetadata]:
        return await self.db.list_secrets(user_id)


def secrets_manager_factory(db: StoreInterface) -> SecretsManager:
    secrets_manager_type = CONFIG.secrets_manager_type
    match secrets_manager_type:
        case SecretsManagerType.SQL:
            return SQLSecretsManager(db)

        case _:
            raise ValueError(f"Unknown secrets manager type: {secrets_manager_type}")
