"""
Agent audit trail. Ports Conformity's non-null-actor rule: every tool call
the agent makes is logged with an actor identity, input, output, and duration.

The frontend renders these under each chat message so founders can see the
agent's work — no black box.

Writes to agent_actions go via SUPABASE_SERVICE_KEY (the caller is trusted
backend code). Reads are RLS-scoped by user_id.
"""

from __future__ import annotations

import time
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


AGENT_ACTOR = "agent:claude"


def _headers() -> dict:
    key = settings.SUPABASE_SERVICE_KEY or ""
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


async def log_action(
    *,
    actor: str,
    user_id: str,
    tool_name: str,
    input: dict,
    output: Optional[dict] = None,
    error: Optional[str] = None,
    duration_ms: Optional[int] = None,
    conversation_id: Optional[str] = None,
) -> None:
    """
    Append one row to agent_actions. Never raises — audit failures must not
    take down the caller (agent loops should degrade gracefully).
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        # Deployment without Supabase — log to app logger instead.
        logger.info(
            "agent_action actor=%s user=%s tool=%s error=%s",
            actor, user_id, tool_name, error,
        )
        return

    payload = {
        "actor": actor,
        "user_id": user_id,
        "tool_name": tool_name,
        "input": _safe_json(input),
        "output": _safe_json(output) if output is not None else None,
        "error": error,
        "duration_ms": duration_ms,
        "conversation_id": conversation_id,
    }

    url = f"{settings.SUPABASE_URL}/rest/v1/agent_actions"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, headers=_headers(), json=payload)
            if response.status_code >= 300:
                logger.warning(
                    "agent_action log failed status=%s body=%s",
                    response.status_code, response.text[:200],
                )
    except Exception as exc:  # noqa: BLE001 — never let audit break the caller
        logger.warning("agent_action log exception: %s", exc)


@asynccontextmanager
async def record_tool_call(
    *,
    actor: str,
    user_id: str,
    tool_name: str,
    input: dict,
    conversation_id: Optional[str] = None,
) -> AsyncIterator["ToolCallRecorder"]:
    """
    Context manager that times a tool call and logs the outcome once the
    caller finishes (either normally or with an exception). Usage:

        async with record_tool_call(actor="agent:claude", user_id=uid,
                                    tool_name="get_metrics", input={...}) as rec:
            result = await get_metrics(...)
            rec.set_output(result)
    """
    recorder = ToolCallRecorder()
    start = time.perf_counter()
    error: Optional[str] = None
    try:
        yield recorder
    except Exception as exc:  # noqa: BLE001
        error = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        duration_ms = int((time.perf_counter() - start) * 1000)
        await log_action(
            actor=actor,
            user_id=user_id,
            tool_name=tool_name,
            input=input,
            output=recorder.output,
            error=error,
            duration_ms=duration_ms,
            conversation_id=conversation_id,
        )


class ToolCallRecorder:
    """Small handle the context manager hands to the caller."""

    def __init__(self) -> None:
        self.output: Optional[dict] = None

    def set_output(self, output: Any) -> None:
        # Coerce anything non-dict into a wrapping dict so JSONB is well-formed.
        if isinstance(output, dict):
            self.output = output
        else:
            self.output = {"value": output}


def _safe_json(value: Any) -> Any:
    """Ensure the audit payload is JSON-serialisable; fall back to str repr."""
    try:
        json.dumps(value, default=str)
        return value
    except Exception:
        return {"_repr": repr(value)[:2000]}
