from pydantic import BaseModel

from admyral.secret.secret import register_secret


@register_secret(secret_type="AWS")
class AWSSecret(BaseModel):
    aws_access_key_id: str
    aws_secret_access_key: str
