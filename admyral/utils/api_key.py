import secrets
import base64


def generate_api_key(length=48):
    """Generate a secure API key."""
    random_bytes = secrets.token_bytes(length)
    return base64.urlsafe_b64encode(random_bytes).decode("utf-8")
