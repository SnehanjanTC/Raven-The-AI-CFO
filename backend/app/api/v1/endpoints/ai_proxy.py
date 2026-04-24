from fastapi import APIRouter, Depends, HTTPException
import httpx
import json
from typing import Optional

from app.core.config import settings
from app.core.deps import require_user
from app.models.user import User
from app.schemas.ai import ChatRequest, ChatResponse

router = APIRouter()

# Provider endpoints and keys
PROVIDERS = {
    "openai": {
        "url": "https://api.openai.com/v1/chat/completions",
        "key_env": "OPENAI_API_KEY",
        "model": "gpt-4",
    },
    "anthropic": {
        "url": "https://api.anthropic.com/v1/messages",
        "key_env": "ANTHROPIC_API_KEY",
        "model": "claude-3-opus",
    },
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        "key_env": "GOOGLE_API_KEY",
        "model": "gemini-pro",
    },
}


async def call_openai(messages: list, api_key: str, model: str = "gpt-4") -> Optional[str]:
    """Call OpenAI API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                PROVIDERS["openai"]["url"],
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 1024,
                },
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"OpenAI error: {str(e)}")
    return None


async def call_anthropic(messages: list, api_key: str, model: str = "claude-3-opus") -> Optional[str]:
    """Call Anthropic API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                PROVIDERS["anthropic"]["url"],
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 1024,
                    "messages": messages,
                },
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                return data["content"][0]["text"]
    except Exception as e:
        print(f"Anthropic error: {str(e)}")
    return None


async def call_gemini(messages: list, api_key: str, model: str = "gemini-pro") -> Optional[str]:
    """Call Google Gemini API."""
    try:
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}],
            })

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PROVIDERS['gemini']['url']}?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={"contents": contents},
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini error: {str(e)}")
    return None


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: User = Depends(require_user),
):
    """
    Proxy chat requests to appropriate AI provider.
    Falls back through providers if one fails.
    """
    providers_to_try = []

    # Determine which providers to try
    if request.provider:
        providers_to_try = [request.provider.lower()]
    else:
        # Default priority order
        providers_to_try = ["anthropic", "openai", "gemini"]

    # Add system context if provided
    messages = [msg.dict() for msg in request.messages]
    if request.context:
        messages.insert(0, {
            "role": "system",
            "content": request.context,
        })

    # Try each provider
    for provider in providers_to_try:
        if provider not in PROVIDERS:
            continue

        provider_config = PROVIDERS[provider]
        api_key = None

        # Get API key from settings or environment
        if provider == "openai":
            api_key = getattr(settings, "OPENAI_API_KEY", None)
        elif provider == "anthropic":
            api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
        elif provider == "gemini":
            api_key = getattr(settings, "GOOGLE_API_KEY", None)

        if not api_key:
            continue

        # Call appropriate provider
        response_text = None
        if provider == "openai":
            response_text = await call_openai(messages, api_key, provider_config["model"])
        elif provider == "anthropic":
            response_text = await call_anthropic(messages, api_key, provider_config["model"])
        elif provider == "gemini":
            response_text = await call_gemini(messages, api_key, provider_config["model"])

        if response_text:
            return ChatResponse(
                content=response_text,
                provider=provider,
                tokens_used=None,
            )

    # If all providers fail
    raise HTTPException(
        status_code=503,
        detail="All AI providers are unavailable. Please try again later.",
    )
