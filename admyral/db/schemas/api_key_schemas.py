from sqlmodel import Field, Relationship, ForeignKeyConstraint
from sqlalchemy import TEXT
from typing import TYPE_CHECKING

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import ApiKey

if TYPE_CHECKING:
    from admyral.db.schemas.auth_schemas import UserSchema


class ApiKeySchema(BaseSchema, table=True):
    """
    Schema for API Keys
    """

    __tablename__ = "api_keys"
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id"],
            ["User.id"],
            ondelete="CASCADE",
        ),
    )

    # primary keys
    id: str = Field(sa_type=TEXT(), primary_key=True)

    # foreign keys
    user_id: str = Field(sa_type=TEXT(), index=True)

    # other fields
    name: str = Field(sa_type=TEXT())
    key: str = Field(sa_type=TEXT(), index=True)

    # relationship parent
    user: "UserSchema" = Relationship(back_populates="api_keys")

    def to_model(self, include_resources: bool = False) -> ApiKey:
        return ApiKey.model_validate(
            {
                "id": self.id,
                "name": self.name,
            }
        )
