"""
Session Start Endpoint for Raven.
Called when user opens the app to provide proactive opener and suggestions.
"""

from fastapi import APIRouter, Depends
from app.core.config import settings
from app.core.deps import require_user
from app.models.user import User
from app.services.proactive import generate_session_opener
from app.services.suggestions import generate_suggestions

router = APIRouter()


@router.get("/start")
async def session_start(
    user: User = Depends(require_user),
):
    """
    Get proactive session opener and initial suggestions.

    Called when user opens the app (on mount of ChatView).

    Returns:
    {
        "greeting": str,
        "nudges": [{ type, message, detail, actions }, ...],
        "metrics_snapshot": dict,
        "suggestions": [{ text, is_new? }, ...]
    }
    """
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    supabase_key = getattr(settings, "SUPABASE_SERVICE_KEY", None)

    if not supabase_url or not supabase_key:
        # Fallback for missing credentials
        return {
            "greeting": "Hey there!",
            "nudges": [],
            "metrics_snapshot": {},
            "suggestions": [
                {"text": "What can you help with?", "is_new": False},
                {"text": "Show me a demo", "is_new": False},
                {"text": "Upload my data", "is_new": True},
                {"text": "Learn more", "is_new": False},
            ],
        }

    try:
        # Generate proactive opener with nudges
        opener_data = await generate_session_opener(supabase_url, supabase_key, user.id)

        # Generate contextual suggestions
        context = {
            "metrics": opener_data.get("metrics_snapshot", {}),
        }
        suggestions = await generate_suggestions(
            supabase_url, supabase_key, user.id, context
        )

        return {
            "greeting": opener_data.get("greeting", "Hey there!"),
            "nudges": opener_data.get("nudges", []),
            "metrics_snapshot": opener_data.get("metrics_snapshot", {}),
            "suggestions": suggestions,
        }

    except Exception as e:
        print(f"Error generating session start: {e}")
        return {
            "greeting": "Hey there!",
            "nudges": [],
            "metrics_snapshot": {},
            "suggestions": [
                {"text": "What can you help with?", "is_new": False},
                {"text": "Show me a demo", "is_new": False},
                {"text": "Upload my data", "is_new": True},
                {"text": "Learn more", "is_new": False},
            ],
        }
