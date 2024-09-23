from pydantic import BaseModel


class ApiKey(BaseModel):
    id: str
    name: str
