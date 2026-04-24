"""
Usage tracking and cost management endpoint.
Provides usage statistics and tracks token consumption.
"""

from fastapi import APIRouter, Depends
from app.core.config import settings
from app.core.deps import require_user
from app.models.user import User
from app.services.usage import get_monthly_usage, check_usage_limit

router = APIRouter()

# Monthly token limit from environment, default 100k
MONTHLY_TOKEN_LIMIT = getattr(settings, "MONTHLY_TOKEN_LIMIT", 100000)


@router.get("/")
async def get_usage(user: User = Depends(require_user)):
    """
    Get current month's token usage for the authenticated user.

    Response:
    {
        "input_tokens": int,
        "output_tokens": int,
        "total_tokens": int,
        "estimated_cost_usd": float,
        "conversations_count": int,
        "usage_percentage": float,  # 0-100
        "within_limit": bool,
        "tokens_remaining": int,
        "limit_tokens": int,
    }
    """
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    supabase_key = getattr(settings, "SUPABASE_SERVICE_KEY", None)

    if not supabase_url or not supabase_key:
        return {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
            "conversations_count": 0,
            "usage_percentage": 0.0,
            "within_limit": True,
            "tokens_remaining": MONTHLY_TOKEN_LIMIT,
            "limit_tokens": MONTHLY_TOKEN_LIMIT,
        }

    try:
        usage = await get_monthly_usage(supabase_url, supabase_key, user.id)
        limit_check = await check_usage_limit(supabase_url, supabase_key, user.id, MONTHLY_TOKEN_LIMIT)

        return {
            **usage,
            **limit_check,
            "limit_tokens": MONTHLY_TOKEN_LIMIT,
        }
    except Exception as e:
        print(f"Error getting usage: {e}")
        return {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "estimated_cost_usd": 0.0,
            "conversations_count": 0,
            "usage_percentage": 0.0,
            "within_limit": True,
            "tokens_remaining": MONTHLY_TOKEN_LIMIT,
            "limit_tokens": MONTHLY_TOKEN_LIMIT,
        }
