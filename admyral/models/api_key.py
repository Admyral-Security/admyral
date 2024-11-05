from pydantic import BaseModel
from datetime import datetime


class ApiKey(BaseModel):
    id: str
    name: str
    created_at: datetime
    user_email: str
