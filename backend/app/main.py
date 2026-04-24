from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging

from app.core.config import settings
from app.core.database import create_tables
from app.core.production import configure_production
from app.core.sentry import init_sentry
from app.api.v1.router import api_router
from app.middleware import AuthMiddleware, RateLimitMiddleware, ErrorHandlerMiddleware

logger = logging.getLogger(__name__)


def get_allowed_origins() -> list[str]:
    """
    Get allowed CORS origins from settings or environment variable.
    Defaults to CORS_ORIGINS from config if ALLOWED_ORIGINS env var is not set.
    """
    allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
    if allowed_origins_env:
        return [origin.strip() for origin in allowed_origins_env.split(",")]
    return settings.CORS_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize production config and error tracking
    try:
        configure_production()
    except Exception as e:
        logger.error(f"Failed to configure production settings: {e}")
        if settings.DEBUG:
            raise

    # Initialize Sentry for error tracking
    init_sentry()

    # Create database tables
    await create_tables()

    yield

    # Shutdown: Cleanup (if needed)
    logger.info("Raven Backend shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Add security headers middleware (must be first)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Only add HSTS in production (when DEBUG=False)
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response


# Add middleware in order: error handler first, then auth, then rate limit
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

# CORS middleware configuration
cors_origins = get_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health_check(request: Request):
    """
    Health check endpoint - no auth required.
    Verifies that the API is running and can access Supabase and Claude API.
    """
    health_status = {
        "status": "healthy",
        "version": settings.VERSION,
        "ai": False,
        "supabase": False,
    }

    # Check if Anthropic API key is configured
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if api_key:
        health_status["ai"] = True

    # Check if Supabase credentials are configured
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    supabase_key = getattr(settings, "SUPABASE_SERVICE_KEY", None)
    if supabase_url and supabase_key:
        health_status["supabase"] = True

    return health_status
