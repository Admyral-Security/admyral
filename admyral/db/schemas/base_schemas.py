from sqlmodel import SQLModel, Field
from sqlalchemy import TIMESTAMP
from sqlalchemy.sql.expression import func
from datetime import datetime
from abc import abstractmethod
from pydantic import BaseModel
from uuid import uuid4


class BaseSchema(SQLModel, table=False):
    created_at: datetime = Field(
        sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_type=TIMESTAMP(), sa_column_kwargs=dict(server_default=func.now())
    )

    @abstractmethod
    def to_model(self, include_resources: bool = False) -> BaseModel:
        """
        TODO: add docstring
        """
        ...

    @staticmethod
    def generate_uuid4() -> str:
        return str(uuid4())
