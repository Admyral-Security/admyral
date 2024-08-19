import os
from abc import abstractmethod
import json

from admyral.secret.secrets_manager import SecretsManager
from admyral.utils.future_executor import execute_future


class _SecretsAccessImpl:
    @abstractmethod
    def get(self, secret_placeholder: str) -> dict[str, str]: ...

    @abstractmethod
    async def aget(self, secret_placeholder: str) -> dict[str, str]: ...


class SecretsStoreAccessImpl(_SecretsAccessImpl):
    def __init__(
        self,
        user_id: str,
        secret_mappings: dict[str, str],
        secrets_manager: SecretsManager,
    ) -> None:
        """
        Args:
            user_id: The user id of the user who is accessing the secrets.
            secret_mappings: The secret mappings for the action. Defined in the workflow function
            secrets_manager: The secrets manager to use.
        """
        self.user_id = user_id
        self.secret_mappings = secret_mappings
        self.secrets_manager = secrets_manager

    def get(self, secret_placeholder: str) -> dict[str, str]:
        return execute_future(self.aget(secret_placeholder))

    async def aget(self, secret_placeholder: str) -> dict[str, str]:
        secret_name = self.secret_mappings.get(secret_placeholder)
        if not secret_name:
            raise ValueError(
                f"No secret mapped to secret placeholder '{secret_placeholder}'."
            )
        secret = await self.secrets_manager.get(self.user_id, secret_name)
        if not secret:
            raise ValueError(f"Secret '{secret_name}' not found.")
        return secret.secret


class EnvVariableSecretsAccessImpl(_SecretsAccessImpl):
    def get(self, secret_placeholder: str) -> dict[str, str]:
        secret_value = os.environ[secret_placeholder]
        if not secret_value:
            raise ValueError(
                f"Secret placeholder '{secret_placeholder}' not found in environment variables."
            )
        return json.loads(secret_value)

    async def aget(self, secret_placeholder: str) -> dict[str, str]:
        return self.get(secret_placeholder)


class Secrets:
    """
    Used to access secrets in the actions.
    """

    def __init__(self, secrets_access_impl: _SecretsAccessImpl) -> None:
        self.secrets_access_impl = secrets_access_impl

    def get(self, secret_placeholder: str) -> dict[str, str]:
        return self.secrets_access_impl.get(secret_placeholder)

    async def aget(self, secret_placeholder: str) -> dict[str, str]:
        return await self.secrets_access_impl.aget(secret_placeholder)

    @classmethod
    def default(cls) -> "Secrets":
        return Secrets(EnvVariableSecretsAccessImpl())
