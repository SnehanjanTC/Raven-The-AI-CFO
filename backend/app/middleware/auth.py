"""
Authentication middleware for Raven API.
Extracts and verifies JWT tokens from Authorization headers.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
from app.core.security import decode_token


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to extract JWT token from Authorization header and verify it.
    Sets user_id in request.state for downstream handlers.
    """

    # Endpoints that don't require authentication
    EXEMPT_PATHS = {
        "/api/health",
        "/api/v1/health",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/guest",
        "/api/docs",
        "/api/redoc",
        "/openapi.json",
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip auth for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Extract Authorization header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={
                    "error": True,
                    "message": "Missing or invalid Authorization header",
                    "code": "UNAUTHORIZED",
                },
            )

        # Extract token
        token = auth_header[7:]  # Remove "Bearer " prefix

        # Verify token
        payload = decode_token(token)
        if not payload:
            return JSONResponse(
                status_code=401,
                content={
                    "error": True,
                    "message": "Invalid or expired token",
                    "code": "INVALID_TOKEN",
                },
            )

        # Extract user_id from token
        user_id = payload.get("sub")
        if not user_id:
            return JSONResponse(
                status_code=401,
                content={
                    "error": True,
                    "message": "Invalid token: missing user_id",
                    "code": "INVALID_TOKEN",
                },
            )

        # Store user_id in request state for downstream handlers
        request.state.user_id = user_id
        request.state.token_payload = payload

        return await call_next(request)
