from pydantic_settings import BaseSettings
from pydantic import validator
from typing import List, Optional
import os


class Settings(BaseSettings):
    APP_NAME: str = "DataFlow AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-change-in-production-must-be-32-chars"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/dataflow_db"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    MAX_FILE_SIZE_MB: int = 100
    UPLOAD_DIR: str = "./uploads"
    EXPORT_DIR: str = "./exports"

    OPENAI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"
    AI_MAX_TOKENS: int = 2000

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174"

    REDIS_URL: Optional[str] = None

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def upload_dir_path(self) -> str:
        path = os.path.abspath(self.UPLOAD_DIR)
        os.makedirs(path, exist_ok=True)
        return path

    @property
    def export_dir_path(self) -> str:
        path = os.path.abspath(self.EXPORT_DIR)
        os.makedirs(path, exist_ok=True)
        return path

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
