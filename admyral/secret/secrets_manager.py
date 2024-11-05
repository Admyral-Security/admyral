from abc import abstractmethod
import json

from admyral.db.store_interface import StoreInterface
from admyral.utils.crypto import decrypt_secret, encrypt_secret
from admyral.models import Secret, SecretMetadata
from admyral.config.config import CONFIG, SecretsManagerType
from admyral.utils.collections import is_empty
from admyral.secret.secret_registry import SecretRegistry


class SecretsManager:
    @abstractmethod
    async def get(self, user_id: str, secret_id: str) -> Secret | None:
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

    async def get(self, user_id: str, secret_id: str) -> Secret | None:
        encrypted_secret = await self.db.get_secret(user_id, secret_id)
        return (
            Secret(
                secret_id=secret_id,
                secret=json.loads(decrypt_secret(encrypted_secret.encrypted_secret)),
            )
            if encrypted_secret
            else None
        )

    def _encrypt_secret(self, secret: dict[str, str]) -> str:
        return encrypt_secret(json.dumps(secret))

    async def update(self, user_id: str, delta_secret: Secret) -> SecretMetadata:
        if SecretRegistry.is_registered(delta_secret.secret_type):
            SecretRegistry.validate_schema(
                delta_secret.secret_type, delta_secret.secret
            )

        encrypted_secret = await self.db.get_secret(user_id, delta_secret.secret_id)
        if not encrypted_secret:
            raise ValueError(f"Secret {delta_secret.secret_id} does not exist.")

        if encrypted_secret.secret_type != delta_secret.secret_type:
            raise ValueError("Secret type cannot be changed.")

        secret = json.loads(decrypt_secret(encrypted_secret.encrypted_secret))

        for key, value in delta_secret.secret.items():
            # ignore empty values - empty values in the delta mean that no
            # update was provided for the key-value pair.
            if is_empty(value):
                continue
            secret[key] = value

        # remove the keys which are not present
        # we only allow editing the schema if the secret type is not valid, i.e.,
        # the secret is a custom secret.
        if not SecretRegistry.is_registered(delta_secret.secret_type):
            removal_keys = set(secret.keys()) - set(delta_secret.secret.keys())
            for key in removal_keys:
                secret.pop(key)

        secret_schema = list(secret.keys())
        updated_encrypted_secret = self._encrypt_secret(secret)

        return await self.db.compare_and_swap_secret(
            user_id,
            delta_secret.secret_id,
            encrypted_secret.encrypted_secret,
            updated_encrypted_secret,
            secret_schema,
            delta_secret.secret_type,
        )

    async def set(self, user_id: str, secret: Secret) -> SecretMetadata:
        if SecretRegistry.is_registered(secret.secret_type):
            SecretRegistry.validate_schema(secret.secret_type, secret.secret)

        encrypted_secret = self._encrypt_secret(secret.secret)
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
