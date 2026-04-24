"""
Sentry error tracking initialization for Raven backend.
Captures exceptions, errors, and performance metrics.
"""

import os
import logging
from typing import Optional


logger = logging.getLogger(__name__)


def init_sentry() -> bool:
    """
    Initialize Sentry for the FastAPI backend.

    Only initializes if SENTRY_DSN is configured and running in production.

    Returns:
        bool: True if Sentry was initialized, False otherwise
    """
    dsn = os.environ.get("SENTRY_DSN")
    environment = os.environ.get("ENVIRONMENT", "development")

    if not dsn:
        logger.debug("Sentry DSN not configured, error tracking disabled")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        # Initialize Sentry
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            traces_sample_rate=0.1,  # Sample 10% of transactions in production
            profiles_sample_rate=0.1 if environment == "production" else 1.0,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR,
                ),
            ],
            # Ignore certain errors that are not actionable
            before_send=_before_send_sentry,
            attach_stacktrace=True,
        )

        logger.info(
            "Sentry error tracking initialized",
            extra={"environment": environment, "sentry_enabled": True}
        )
        return True

    except ImportError:
        logger.warning(
            "sentry-sdk not installed. Install with: pip install sentry-sdk[fastapi]"
        )
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def _before_send_sentry(event: dict, hint: dict) -> Optional[dict]:
    """
    Filter events before sending to Sentry.

    Ignores events that are not actionable or are too noisy.

    Args:
        event: The event dict
        hint: The hint dict with original exception

    Returns:
        The event dict or None to ignore
    """
    # Ignore 404 errors (not found)
    if event.get("request", {}).get("url", "").startswith("/404"):
        return None

    # Ignore timeout errors (often user network issues)
    if "timeout" in str(hint.get("exc_info", [1])).lower():
        return None

    # Ignore connection errors from external services
    if "connection" in str(hint.get("exc_info", [1])).lower():
        return None

    # Ignore errors from health check endpoint
    if "/health" in event.get("request", {}).get("url", ""):
        return None

    return event


def set_sentry_user(user_id: str, email: Optional[str] = None, name: Optional[str] = None) -> None:
    """
    Set the current user context for error tracking.

    Args:
        user_id: The user's ID
        email: The user's email address
        name: The user's name
    """
    try:
        import sentry_sdk

        sentry_sdk.set_user({
            "id": user_id,
            "email": email,
            "username": name,
        })
    except ImportError:
        pass  # Sentry not installed


def clear_sentry_user() -> None:
    """Clear the current user context."""
    try:
        import sentry_sdk

        sentry_sdk.set_user(None)
    except ImportError:
        pass  # Sentry not installed


def capture_sentry_exception(exception: Exception, context: Optional[dict] = None) -> None:
    """
    Manually capture an exception in Sentry.

    Args:
        exception: The exception to capture
        context: Additional context to include
    """
    try:
        import sentry_sdk

        if context:
            sentry_sdk.with_scope(lambda scope: {
                scope.set_context("additional", context),
                sentry_sdk.capture_exception(exception),
            })
        else:
            sentry_sdk.capture_exception(exception)
    except ImportError:
        pass  # Sentry not installed


def add_sentry_breadcrumb(
    message: str,
    level: str = "info",
    category: str = "action",
    data: Optional[dict] = None,
) -> None:
    """
    Add a breadcrumb for debugging.

    Args:
        message: The breadcrumb message
        level: The severity level (debug, info, warning, error)
        category: The breadcrumb category
        data: Additional data to include
    """
    try:
        import sentry_sdk

        sentry_sdk.add_breadcrumb(
            message=message,
            level=level,
            category=category,
            data=data or {},
        )
    except ImportError:
        pass  # Sentry not installed
