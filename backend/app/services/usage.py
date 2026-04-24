"""
Token usage tracking for Claude API cost management.
Logs usage metrics and provides cost analysis and limits.
"""

import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict


async def track_usage(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    conversation_id: str,
    input_tokens: int,
    output_tokens: int,
    model: str = "claude-3-5-sonnet-20241022",
) -> bool:
    """
    Track token usage for a Claude API call.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        conversation_id: Conversation ID
        input_tokens: Number of input tokens used
        output_tokens: Number of output tokens used
        model: Claude model name

    Returns:
        True if tracking succeeded, False otherwise
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    url = f"{supabase_url}/rest/v1/usage"

    payload = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model,
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            return response.status_code in (200, 201)
    except Exception as e:
        print(f"Error tracking usage: {e}")
        return False


async def get_monthly_usage(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> Dict:
    """
    Get monthly token usage statistics for a user.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID

    Returns:
        Dict with usage stats:
        {
            "input_tokens": int,
            "output_tokens": int,
            "total_tokens": int,
            "estimated_cost_usd": float,
            "conversations_count": int,
        }
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Get current month start and end
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

    # Query usage for current month
    url = (
        f"{supabase_url}/rest/v1/usage?"
        f"user_id=eq.{user_id}"
        f"&created_at=gte.{month_start.isoformat()}"
        f"&created_at=lte.{month_end.isoformat()}"
        f"&select=input_tokens,output_tokens,conversation_id"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                records = response.json()

                # Calculate totals
                total_input = sum(r.get("input_tokens", 0) for r in records)
                total_output = sum(r.get("output_tokens", 0) for r in records)
                total_tokens = total_input + total_output

                # Count conversations (de-dupe)
                conversations = set(r.get("conversation_id") for r in records if r.get("conversation_id"))

                # Cost estimation for Claude Sonnet
                # $3 per 1M input tokens, $15 per 1M output tokens
                input_cost = (total_input / 1_000_000) * 3.0
                output_cost = (total_output / 1_000_000) * 15.0
                total_cost = input_cost + output_cost

                return {
                    "input_tokens": total_input,
                    "output_tokens": total_output,
                    "total_tokens": total_tokens,
                    "estimated_cost_usd": round(total_cost, 2),
                    "conversations_count": len(conversations),
                }
    except Exception as e:
        print(f"Error fetching monthly usage: {e}")

    return {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "estimated_cost_usd": 0.0,
        "conversations_count": 0,
    }


async def check_usage_limit(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    limit_tokens: int = 100000,
) -> Dict:
    """
    Check if user is within monthly token limit.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        limit_tokens: Monthly token limit (default: 100k)

    Returns:
        Dict with:
        {
            "within_limit": bool,
            "usage_percentage": float,  # 0-100
            "tokens_remaining": int,
        }
    """
    usage = await get_monthly_usage(supabase_url, supabase_key, user_id)

    total_tokens = usage.get("total_tokens", 0)
    usage_percentage = (total_tokens / limit_tokens * 100) if limit_tokens > 0 else 0
    tokens_remaining = max(0, limit_tokens - total_tokens)

    return {
        "within_limit": total_tokens <= limit_tokens,
        "usage_percentage": min(100, usage_percentage),
        "tokens_remaining": tokens_remaining,
    }
