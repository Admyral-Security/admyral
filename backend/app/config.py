from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    API_V1_STR: str = "/api/v1"
    DATABASE_SCHEMA: str = "admyral"

    DATABASE_URL_ASYNCPG: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    WEBHOOK_SIGNING_SECRET: str

    OPENAI_API_KEY: str

    WORKFLOW_RUN_HOURLY_QUOTA: Optional[int] = None
    WORKFLOW_RUN_TIMEOUT_IN_MINUTES: Optional[int] = None
    WORKFLOW_ASSISTANT_DAILY_QUOTA: Optional[int] = None

    
settings = Settings()