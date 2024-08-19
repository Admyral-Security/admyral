from sqlmodel import Field
from sqlalchemy import TEXT, JSON

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import PythonAction, ActionMetadata
from admyral.typings import JsonValue


class PythonActionSchema(BaseSchema, table=True):
    """
    Schema for Python Actions
    """

    __tablename__ = "python_actions"

    # primary keys
    user_id: str = Field(sa_type=TEXT(), primary_key=True)  # TODO: link to users table
    action_type: str = Field(sa_type=TEXT(), primary_key=True)

    # other fields
    import_statements: str = Field(sa_type=TEXT())
    code: str = Field(sa_type=TEXT())
    display_name: str = Field(sa_type=TEXT())
    display_namespace: str = Field(sa_type=TEXT())
    description: str | None = Field(sa_type=TEXT(), nullable=True)
    secrets_placeholders: str | None = Field(sa_type=TEXT(), nullable=True)
    requirements: str | None = Field(sa_type=TEXT(), nullable=True)
    arguments: list[dict[str, JsonValue]] = Field(sa_type=JSON())

    def to_model(self, include_resources: bool = False) -> PythonAction:
        return PythonAction.model_validate(
            {
                "action_type": self.action_type,
                "import_statements": self.import_statements,
                "code": self.code,
                "display_name": self.display_name,
                "display_namespace": self.display_namespace,
                "description": self.description,
                "secrets_placeholders": self.secrets_placeholders.split(";")
                if self.secrets_placeholders
                else [],
                "requirements": self.requirements.split(";")
                if self.requirements
                else [],
                "arguments": self.arguments,
            }
        )

    def to_metadata(self) -> ActionMetadata:
        return ActionMetadata.model_validate(
            {
                "action_type": self.action_type,
                "display_name": self.display_name,
                "display_namespace": self.display_namespace,
                "description": self.description,
                "secrets_placeholders": self.secrets_placeholders.split(";")
                if self.secrets_placeholders
                else [],
                "arguments": self.arguments,
            }
        )
