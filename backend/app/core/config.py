import json
import os
from typing import Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_ENV: str = ""
    PROJECT_NAME: str = "LIFORA"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = ""
    SYNC_DATABASE_URL: str = ""

    # Security & JWT
    SECRET_KEY: str = "fitpulse-super-secret-production-key-must-be-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Public URLs & CORS
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # API Documentation toggle in production
    ENABLE_DOCS: bool = False

    # AI Integration
    AI_PROVIDER: str = ""  # "openai", "gemini", etc.
    AI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"

    # SMTP / Production Email configuration
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@lifora.app"
    SMTP_TLS: bool = True

    # Cloud Object Storage (S3-compatible) for production uploads
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "auto"

    # Uploads directory
    UPLOAD_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "uploads",
    )

    @model_validator(mode="after")
    def post_process_settings(self) -> Self:
        # Sync APP_ENV and ENVIRONMENT
        if self.APP_ENV and not os.getenv("ENVIRONMENT"):
            self.ENVIRONMENT = self.APP_ENV
        elif self.ENVIRONMENT and not self.APP_ENV:
            self.APP_ENV = self.ENVIRONMENT

        is_prod = self.ENVIRONMENT.lower() == "production" or self.APP_ENV.lower() == "production"

        # Fail fast in production if DATABASE_URL is missing or defaulting to localhost
        if is_prod:
            env_db = os.environ.get("DATABASE_URL", "")
            if not self.DATABASE_URL or not env_db or "localhost" in self.DATABASE_URL or "127.0.0.1" in self.DATABASE_URL:
                raise RuntimeError(
                    "DATABASE_URL environment variable is required in production but was not provided (or points to localhost). "
                    "Ensure Render has properly linked the PostgreSQL database to lifora-backend."
                )

        # In development/test mode, fall back to local database if unconfigured
        if not self.DATABASE_URL:
            self.DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/fitpulse_db"
            self.SYNC_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/fitpulse_db"
            return self

        # Normalize DATABASE_URL for async engine (asyncpg)
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        self.DATABASE_URL = url

        # Derive or normalize SYNC_DATABASE_URL for sync migrations (psycopg2)
        # If SYNC_DATABASE_URL was not set or if in production it still points to localhost while DATABASE_URL does not:
        if not self.SYNC_DATABASE_URL or (is_prod and "localhost" in self.SYNC_DATABASE_URL and "localhost" not in url):
            sync_url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            sync_url = sync_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            self.SYNC_DATABASE_URL = sync_url
        else:
            s_url = self.SYNC_DATABASE_URL
            if s_url.startswith("postgres://"):
                s_url = s_url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif s_url.startswith("postgresql://") and not s_url.startswith("postgresql+"):
                s_url = s_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif s_url.startswith("postgresql+asyncpg://"):
                s_url = s_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            self.SYNC_DATABASE_URL = s_url

        # Ensure FRONTEND_URL is in CORS_ORIGINS
        if self.FRONTEND_URL and isinstance(self.CORS_ORIGINS, list):
            clean_fe = self.FRONTEND_URL.rstrip("/")
            if clean_fe not in self.CORS_ORIGINS:
                self.CORS_ORIGINS.append(clean_fe)

        return self

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
