"""
Rate limiting middleware for Raven API.
Uses in-memory rate limiter with timestamps for early production.
"""

import time
from typing import Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(retry_after)},
        )


class RateLimiter:
    """Simple in-memory rate limiter with per-user limits."""

    def __init__(self):
        self.requests: dict[str, list[float]] = {}
        self.cleanup_interval = 60  # Clean old entries every 60 seconds
        self.last_cleanup = time.time()

    def _cleanup(self) -> None:
        """Remove expired entries older than 1 hour."""
        now = time.time()
        if now - self.last_cleanup < self.cleanup_interval:
            return

        cutoff = now - 3600  # 1 hour
        keys_to_delete = []

        for key, timestamps in self.requests.items():
            self.requests[key] = [ts for ts in timestamps if ts > cutoff]
            if not self.requests[key]:
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del self.requests[key]

        self.last_cleanup = now

    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int]:
        """
        Check if request is allowed and return (allowed, retry_after_seconds).
        """
        self._cleanup()
        now = time.time()
        cutoff = now - window_seconds

        if key not in self.requests:
            self.requests[key] = []

        # Remove expired timestamps
        self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]

        if len(self.requests[key]) < max_requests:
            self.requests[key].append(now)
            return True, 0

        # Calculate retry-after: time until oldest request expires
        oldest_request = min(self.requests[key])
        retry_after = int(window_seconds - (now - oldest_request)) + 1
        return False, retry_after


# Global rate limiter instance
_rate_limiter = RateLimiter()

# Rate limit configuration
RATE_LIMITS = {
    "chat": {"max_requests": 60, "window_seconds": 60},  # 60 req/min per user
    "csv_upload": {"max_requests": 10, "window_seconds": 86400},  # 10 req/day per user
    "api": {"max_requests": 120, "window_seconds": 60},  # 120 req/min per user
}


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance."""
    return _rate_limiter


def check_rate_limit(
    user_id: str,
    endpoint: str,
    rate_limiter: Optional[RateLimiter] = None,
) -> None:
    """
    Check if a request is within rate limits.
    Raises RateLimitExceeded if limit is exceeded.
    """
    if not rate_limiter:
        rate_limiter = get_rate_limiter()

    if endpoint not in RATE_LIMITS:
        endpoint = "api"

    limit_config = RATE_LIMITS[endpoint]
    key = f"{user_id}:{endpoint}"

    allowed, retry_after = rate_limiter.is_allowed(
        key,
        limit_config["max_requests"],
        limit_config["window_seconds"],
    )

    if not allowed:
        raise RateLimitExceeded(retry_after)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting by user_id."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Extract user_id from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)

        # Skip rate limiting for unauthenticated requests
        if not user_id:
            return await call_next(request)

        # Determine endpoint category
        path = request.url.path
        if "/chat" in path:
            endpoint = "chat"
        elif "/csv" in path:
            endpoint = "csv_upload"
        else:
            endpoint = "api"

        # Check rate limit
        try:
            check_rate_limit(user_id, endpoint)
        except RateLimitExceeded as e:
            return Response(
                content='{"error": true, "message": "Rate limit exceeded", "code": "RATE_LIMIT_EXCEEDED"}',
                status_code=e.status_code,
                headers=e.headers,
                media_type="application/json",
            )

        return await call_next(request)
