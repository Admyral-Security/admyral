from pydantic import BaseModel


def register_secret(secret_type: str) -> BaseModel:
    """
    Register a secret model with the SecretRegistry.

    Args:
        secret_type: Unique identifier for the secret type

    Returns:
        A decorator that registers the decorated BaseModel class

    Example:
        @register_secret("openai")
        class OpenAISecret(BaseModel):
            api_key: str
    """

    def inner(secret: BaseModel) -> BaseModel:
        from admyral.secret.secret_registry import SecretRegistry

        SecretRegistry.register_secret(secret_type, secret)
        return secret

    return inner
