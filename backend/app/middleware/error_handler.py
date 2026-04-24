"""
Global error handling for Raven API.
Catches unhandled exceptions and returns safe error responses.
"""

import logging
import traceback
from typing import Callable
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Global exception handler middleware.
    Catches unhandled exceptions and returns safe error responses without leaking stack traces.
    """

    async def dispatch(self, request: Request, call_next) -> JSONResponse:
        try:
            return await call_next(request)
        except Exception as e:
            return self._handle_exception(e, request)

    def _handle_exception(self, exc: Exception, request: Request) -> JSONResponse:
        """Handle an exception and return appropriate error response."""

        # Log the full error server-side
        error_trace = traceback.format_exc()
        logger.error(
            f"Unhandled exception in {request.method} {request.url.path}:\n{error_trace}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "exception_type": type(exc).__name__,
            },
        )

        # Determine status code and message based on exception type
        status_code = 500
        message = "An internal error occurred"
        code = "INTERNAL_ERROR"

        # Network/service errors
        if self._is_network_error(exc):
            status_code = 503
            message = "AI service temporarily unavailable"
            code = "SERVICE_UNAVAILABLE"
        elif self._is_database_error(exc):
            status_code = 503
            message = "Database temporarily unavailable"
            code = "SERVICE_UNAVAILABLE"
        elif self._is_validation_error(exc):
            status_code = 400
            message = "Invalid request"
            code = "VALIDATION_ERROR"
        elif self._is_timeout_error(exc):
            status_code = 504
            message = "Request timeout"
            code = "TIMEOUT"

        return JSONResponse(
            status_code=status_code,
            content={
                "error": True,
                "message": message,
                "code": code,
            },
        )

    @staticmethod
    def _is_network_error(exc: Exception) -> bool:
        """Check if exception is a network/httpx error."""
        exc_name = type(exc).__name__
        exc_module = type(exc).__module__

        network_indicators = {
            "httpx.ConnectError",
            "httpx.TimeoutException",
            "httpx.NetworkError",
            "httpx.RequestError",
            "aiohttp.ClientError",
            "ConnectionError",
            "TimeoutError",
        }

        full_name = f"{exc_module}.{exc_name}"
        return any(indicator in full_name for indicator in network_indicators)

    @staticmethod
    def _is_database_error(exc: Exception) -> bool:
        """Check if exception is a database error."""
        exc_name = type(exc).__name__
        exc_module = type(exc).__module__

        db_indicators = {
            "sqlalchemy.SQLAlchemyError",
            "asyncpg.PostgresError",
            "psycopg2.Error",
            "pymongo.errors.PyMongoError",
            "sqlite3.Error",
        }

        full_name = f"{exc_module}.{exc_name}"
        return any(indicator in full_name for indicator in db_indicators)

    @staticmethod
    def _is_validation_error(exc: Exception) -> bool:
        """Check if exception is a validation error."""
        exc_name = type(exc).__name__
        return exc_name in {"ValueError", "TypeError", "KeyError"}

    @staticmethod
    def _is_timeout_error(exc: Exception) -> bool:
        """Check if exception is a timeout."""
        exc_name = type(exc).__name__
        return exc_name in {"TimeoutError", "asyncio.TimeoutError", "concurrent.futures.TimeoutError"}
