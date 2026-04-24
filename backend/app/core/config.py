import os

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Raven API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./raven.db"  # Default SQLite for dev, override with PostgreSQL

    # Auth — SECRET_KEY must be set via environment variable in production
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "raven-dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # AI Provider (Claude/Anthropic only)
    ANTHROPIC_API_KEY: Optional[str] = None

    # Supabase — for REST API calls to fetch/write financial data
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # Encryption key for stored integration credentials
    ENCRYPTION_KEY: Optional[str] = None

    # CORS - can be overridden via ALLOWED_ORIGINS env var (comma-separated)
    CORS_ORIGINS: list[str] = ["http://localhost:3002", "http://localhost:5173", "http://localhost:3000"]

    # JWT secret from environment for Supabase JWT verification (optional)
    SUPABASE_JWT_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
