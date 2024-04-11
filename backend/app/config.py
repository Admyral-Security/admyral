from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    API_V1_STR: str = "/api/v1"
    DATABASE_SCHEMA: str = "admyral"

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"

    
settings = Settings()