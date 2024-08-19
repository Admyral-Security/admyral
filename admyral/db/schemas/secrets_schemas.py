from sqlmodel import Field
from sqlalchemy import TEXT
from typing import Optional
import json

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import EncryptedSecret, SecretMetadata


class SecretsSchema(BaseSchema, table=True):
    """
    Schema for Secrets
    """

    __tablename__ = "secrets"

    # primary keys
    secret_id: str = Field(sa_type=TEXT(), primary_key=True)

    # foreign keys
    user_id: str = Field(sa_type=TEXT(), index=True)  # TODO: FK to users table

    # other fields
    encrypted_secret: Optional[str] = Field(sa_type=TEXT(), nullable=True)
    """ Note: encrypted_secret is nullable because we may not have the secret stored in the database. """
    schema_json_serialized: str = Field(sa_type=TEXT())
    """ Serialized JSON Array of key names of the secret. """

    def to_model(self, include_resources: bool = False) -> EncryptedSecret:
        return EncryptedSecret.model_validate(
            {
                "secret_id": self.secret_id,
                "encrypted_secret": self.encrypted_secret,
                "secret_schema": json.loads(self.schema_json_serialized),
            }
        )

    def to_metadata(self) -> SecretMetadata:
        return SecretMetadata.model_validate(
            {
                "secret_id": self.secret_id,
                "secret_schema": json.loads(self.schema_json_serialized),
            }
        )
