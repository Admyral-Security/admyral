from datetime import datetime
from sqlmodel import Field
from sqlalchemy import TEXT, TIMESTAMP

from admyral.db.schemas.base_schemas import BaseSchema
from admyral.models import PipLockfile


class PipLockfileCacheSchema(BaseSchema, table=True):
    """
    Schema for pip lockfile cache
    """

    __tablename__ = "pip_lockfile_cache"

    # primary keys
    hash: str = Field(sa_type=TEXT(), primary_key=True)

    # other fields
    lockfile: str = Field(sa_type=TEXT())
    expiration_time: datetime = Field(sa_type=TIMESTAMP())

    def to_model(self) -> PipLockfile:
        return PipLockfile.model_validate(
            {
                "hash": self.hash,
                "lockfile": self.lockfile,
                "expiration_time": self.expiration_time_unix,
            }
        )

    @property
    def expiration_time_unix(self) -> int:
        return int(self.expiration_time.timestamp())

    @expiration_time_unix.setter
    def expiration_time_unix(self, value: int):
        self.expiration_time = datetime.fromtimestamp(value)
