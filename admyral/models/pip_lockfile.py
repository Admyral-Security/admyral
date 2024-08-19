from pydantic import BaseModel


class PipLockfile(BaseModel):
    hash: str
    lockfile: str
    expiration_time: int
    """ UTC timestamp in seconds """
