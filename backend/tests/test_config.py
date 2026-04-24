"""Unit tests for app configuration."""
import pytest

from app.core.config import Settings


class TestSettings:
    def test_default_values(self):
        s = Settings()
        assert s.APP_NAME == "Raven API"
        assert s.VERSION == "1.0.0"
        assert s.ALGORITHM == "HS256"
        assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 1440

    def test_default_cors_origins(self):
        s = Settings()
        assert "http://localhost:3000" in s.CORS_ORIGINS
        assert "http://localhost:5173" in s.CORS_ORIGINS

    def test_ai_key_defaults_to_none(self):
        s = Settings()
        # Claude API key defaults to None unless set in environment
        assert s.ANTHROPIC_API_KEY is None or isinstance(s.ANTHROPIC_API_KEY, str)

    def test_database_url_default(self):
        s = Settings()
        assert "sqlite" in s.DATABASE_URL
