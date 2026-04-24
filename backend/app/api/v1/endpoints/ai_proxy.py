from fastapi import APIRouter, Depends, HTTPException
import httpx
import json
from typing import Optional

from app.core.config import settings
from app.core.deps import require_user
from app.models.user import User
from app.schemas.ai import ChatRequest, ChatResponse

router = APIRouter()

# Claude API configuration
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
CLAUDE_API_VERSION = "2023-06-01"


async def call_claude(messages: list, api_key: str, model: str = CLAUDE_MODEL, max_tokens: int = 4096) -> Optional[str]:
    """Call Anthropic Claude API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CLAUDE_API_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": CLAUDE_API_VERSION,
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "messages": messages,
                },
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                return data["content"][0]["text"]
            else:
                error_detail = await response.text()
                raise Exception(f"Claude API error ({response.status_code}): {error_detail}")
    except Exception as e:
        print(f"Claude error: {str(e)}")
        raise


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: User = Depends(require_user),
):
    """
    Proxy chat requests to Claude API.
    """
    # Get API key from settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Claude API key is not configured. Please set ANTHROPIC_API_KEY in environment.",
        )

    # Build message list
    messages = [msg.dict() for msg in request.messages]

    # Add system context if provided
    if request.context:
        # Prepend system context as a user message (Claude doesn't have a native system role in v1/messages)
        messages.insert(0, {
            "role": "user",
            "content": f"[SYSTEM CONTEXT]\n{request.context}\n\n[END SYSTEM CONTEXT]"
        })

    try:
        response_text = await call_claude(messages, api_key)
        return ChatResponse(
            content=response_text,
            tokens_used=None,  # Could be extended to track token usage if needed
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Claude API error: {str(e)}",
        )
