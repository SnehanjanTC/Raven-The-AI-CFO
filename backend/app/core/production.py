"""
Production-specific configuration and setup for Raven backend.
This module handles environment-aware settings and logging configuration.
"""

import logging
import json
import os
import sys
from datetime import datetime
from typing import Optional


def get_environment() -> str:
    """
    Get the current environment (development or production).

    Returns:
        str: "production" or "development" (default)
    """
    return os.environ.get("ENVIRONMENT", "development").lower()


def is_production() -> bool:
    """Check if running in production mode."""
    return get_environment() == "production"


def setup_logging(app_name: str = "Raven") -> logging.Logger:
    """
    Configure structured logging for the application.

    In production: JSON structured logging to stdout
    In development: Colored console logging with more verbosity

    Args:
        app_name: Application name for logging context

    Returns:
        logging.Logger: Configured logger instance
    """
    logger = logging.getLogger(app_name)

    # Remove existing handlers
    logger.handlers = []

    # Determine log level based on environment
    log_level = logging.INFO if is_production() else logging.DEBUG
    logger.setLevel(log_level)

    if is_production():
        # JSON structured logging for production
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_ProductionJSONFormatter())
    else:
        # Colored console logging for development
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_DevelopmentFormatter())

    logger.addHandler(handler)

    return logger


class _ProductionJSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging in production.
    Includes timestamp, level, logger name, and message.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
        }

        # Include exception info if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Include extra fields if provided
        if hasattr(record, "extra_fields"):
            log_obj.update(record.extra_fields)

        return json.dumps(log_obj)


class _DevelopmentFormatter(logging.Formatter):
    """
    Human-readable formatter for development logging.
    Includes colors and detailed formatting.
    """

    # ANSI color codes
    COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[35m",   # Magenta
        "RESET": "\033[0m",       # Reset
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]

        # Format: [TIMESTAMP] [LEVEL] [MODULE] message
        log_format = (
            f"{color}[{record.levelname:8s}]{reset} "
            f"[{record.name:20s}] "
            f"{record.getMessage()}"
        )

        if record.exc_info:
            log_format += f"\n{self.formatException(record.exc_info)}"

        return log_format


class ProductionSettings:
    """
    Production environment settings validator.
    Ensures all required environment variables are set.
    """

    REQUIRED_VARS_PRODUCTION = [
        "ANTHROPIC_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "SECRET_KEY",
    ]

    REQUIRED_VARS_OPTIONAL = [
        "SENTRY_DSN",
        "ENCRYPTION_KEY",
    ]

    @classmethod
    def validate(cls, logger: Optional[logging.Logger] = None) -> bool:
        """
        Validate that all required environment variables are set.

        Args:
            logger: Optional logger for warnings

        Returns:
            bool: True if all required vars are set, False otherwise
        """
        if not is_production():
            return True

        missing_vars = []

        for var in cls.REQUIRED_VARS_PRODUCTION:
            if not os.environ.get(var):
                missing_vars.append(var)

        if missing_vars:
            message = f"Missing required environment variables: {', '.join(missing_vars)}"
            if logger:
                logger.error(message)
            else:
                print(f"ERROR: {message}", file=sys.stderr)
            return False

        # Warn about optional but recommended vars
        for var in cls.REQUIRED_VARS_OPTIONAL:
            if not os.environ.get(var):
                message = f"Optional environment variable not set: {var}"
                if logger:
                    logger.warning(message)

        return True


def configure_production():
    """
    Initialize production configuration.
    Call this at application startup.
    """
    # Setup logging
    logger = setup_logging()

    # Validate production environment
    if not ProductionSettings.validate(logger):
        if is_production():
            raise ValueError("Production environment validation failed")

    # Log startup
    logger.info(
        f"Raven Backend starting in {get_environment().upper()} mode",
        extra={"extra_fields": {"environment": get_environment()}}
    )

    return logger
