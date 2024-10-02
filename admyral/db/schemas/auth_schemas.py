from sqlmodel import (
    Field,
    SQLModel,
    UniqueConstraint,
    ForeignKeyConstraint,
    Relationship,
)
from sqlalchemy import TEXT, TIMESTAMP, BOOLEAN, Column
from datetime import datetime

from admyral.models.auth import User
from admyral.db.schemas.api_key_schemas import ApiKeySchema
from admyral.db.schemas.workflow_schemas import WorkflowSchema
from admyral.db.schemas.secrets_schemas import SecretsSchema
from admyral.db.schemas.base_schemas import BaseSchema


class UserSchema(BaseSchema, table=True):
    """
    Schema for Users

    Needs to match the NextAuth schema:
    https://authjs.dev/getting-started/adapters/prisma
    """

    __tablename__ = "User"
    __table_args__ = (UniqueConstraint("email"),)

    id: str = Field(sa_type=TEXT(), primary_key=True)
    name: str | None = Field(sa_type=TEXT(), nullable=True)
    email: str = Field(sa_type=TEXT())
    email_verified: datetime | None = Field(sa_type=TIMESTAMP(), nullable=True)
    image: str | None = Field(sa_type=TEXT(), nullable=True)

    # relationship children
    accounts: list["AccountSchema"] = Relationship(
        back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    sessions: list["SessionSchema"] = Relationship(
        back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    authenticators: list["AuthenticatorSchema"] = Relationship(
        back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    workflows: list[WorkflowSchema] = Relationship(
        back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    api_keys: list[ApiKeySchema] = Relationship(
        back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete")
    )
    secrets: list[SecretsSchema] = Relationship(
        back_populates="user", sa_relationship_kwargs=dict(cascade="all, delete")
    )

    def to_model(self) -> User:
        return User.model_validate(
            {
                "id": self.id,
                "name": self.name,
                "email": self.email,
                "email_verified": self.email_verified,
                "image": self.image,
                "created_at": self.created_at,
                "updated_at": self.updated_at,
            }
        )


class AccountSchema(BaseSchema, table=True):
    """
    Schema for Accounts

    Needs to match the NextAuth schema:
    https://authjs.dev/getting-started/adapters/prisma
    """

    __tablename__ = "Account"
    __table_args__ = (
        UniqueConstraint("provider", "providerAccountId"),
        ForeignKeyConstraint(
            ["userId"],
            ["User.id"],
            ondelete="CASCADE",
        ),
    )

    user_id: str = Field(sa_column=Column("userId", TEXT(), nullable=False))
    type: str = Field(sa_type=TEXT())
    provider: str = Field(sa_type=TEXT(), primary_key=True)
    provider_account_id: str = Field(
        sa_column=Column("providerAccountId", TEXT(), nullable=False, primary_key=True)
    )
    refresh_token: str | None = Field(sa_type=TEXT(), nullable=True)
    access_token: str | None = Field(sa_type=TEXT(), nullable=True)
    expires_at: int | None = Field(nullable=True)
    token_type: str | None = Field(sa_type=TEXT(), nullable=True)
    scope: str | None = Field(sa_type=TEXT(), nullable=True)
    id_token: str | None = Field(sa_type=TEXT(), nullable=True)
    session_state: str | None = Field(sa_type=TEXT(), nullable=True)

    # relationship parents
    user: "UserSchema" = Relationship(back_populates="accounts")


class SessionSchema(BaseSchema, table=True):
    """
    Schema for Session

    Needs to match the NextAuth schema:
    https://authjs.dev/getting-started/adapters/prisma
    """

    __tablename__ = "Session"
    __table_args__ = (
        UniqueConstraint("sessionToken"),
        ForeignKeyConstraint(
            ["userId"],
            ["User.id"],
            ondelete="CASCADE",
        ),
    )

    id: str = Field(sa_type=TEXT(), primary_key=True)
    session_token: str = Field(sa_column=Column("sessionToken", TEXT(), nullable=False))
    user_id: str = Field(sa_column=Column("userId", TEXT(), nullable=False))
    expires: datetime

    # relationship parents
    user: "UserSchema" = Relationship(back_populates="sessions")


class VerificationTokenSchema(SQLModel, table=True):
    """
    Schema for VerificationToken

    Needs to match the NextAuth schema:
    https://authjs.dev/getting-started/adapters/prisma
    """

    __tablename__ = "VerificationToken"
    __table_args__ = (UniqueConstraint("identifier", "token"),)

    identifier: str = Field(sa_type=TEXT(), primary_key=True)
    token: str = Field(sa_type=TEXT(), primary_key=True)
    expires: datetime


class AuthenticatorSchema(SQLModel, table=True):
    """
    Schema for Authenticator

    Needs to match the NextAuth schema:
    https://authjs.dev/getting-started/adapters/prisma
    """

    __tablename__ = "Authenticator"
    __table_args__ = (
        UniqueConstraint("credentialID"),
        ForeignKeyConstraint(
            ["userId"],
            ["User.id"],
            ondelete="CASCADE",
        ),
    )

    credential_id: str = Field(
        sa_column=Column("credentialID", TEXT(), primary_key=True)
    )
    user_id: str = Field(sa_column=Column("userId", TEXT(), primary_key=True))
    provider_account_id: str = Field(
        sa_column=Column("providerAccountId", TEXT(), nullable=False)
    )
    credential_public_key: str = Field(
        sa_column=Column("credentialPublicKey", TEXT(), nullable=False)
    )
    counter: int
    credential_device_type: str = Field(
        sa_column=Column("credentialDeviceType", TEXT(), nullable=False)
    )
    credentialBackedUp: bool = Field(
        sa_column=Column("credentialBackedUp", BOOLEAN(), nullable=False)
    )
    transports: str | None = Field(sa_type=TEXT(), nullable=True)

    # relationship parents
    user: "UserSchema" = Relationship(back_populates="authenticators")
