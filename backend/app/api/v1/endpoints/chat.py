"""
Chat endpoint for Claude AI CFO with tool support and streaming.
Handles streaming responses with SSE and tool calling.
"""

import json
import httpx
from typing import Optional, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.services.system_prompt import build_system_prompt
from app.middleware.sanitize import sanitize_chat_input
from app.middleware.rate_limit import check_rate_limit
from app.services.tools import (
    get_metrics, run_scenario, get_transactions, generate_report,
    update_metrics, add_transaction
)
from app.services.context_builder import (
    build_financial_context, format_context_for_prompt, invalidate_context_cache
)
from app.services.onboarding import (
    get_onboarding_state, get_onboarding_system_prompt_addition,
    get_onboarding_suggestions
)
from app.services.demo_data import (
    seed_demo_data, clear_demo_data
)
from app.services.suggestions import track_feature_usage
from app.services.usage import track_usage, check_usage_limit
from app.schemas.ai import ChatRequest, ChatMessage

router = APIRouter()

# Claude API configuration
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
CLAUDE_API_VERSION = "2023-06-01"

# Monthly token limit (configurable via env)
MONTHLY_TOKEN_LIMIT = getattr(settings, "MONTHLY_TOKEN_LIMIT", 100000)


def get_tool_definitions() -> list[dict]:
    """Define available tools for Claude."""
    return [
        {
            "name": "get_metrics",
            "description": "Get current financial metrics (MRR, burn rate, runway, cash balance, margins)",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
        {
            "name": "get_transactions",
            "description": "Get recent transactions, optionally filtered by category",
            "input_schema": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Max number of transactions to return (default: 20)",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category to filter by (e.g. 'salary', 'marketing')",
                    },
                },
                "required": [],
            },
        },
        {
            "name": "run_scenario",
            "description": "Run a what-if financial scenario with adjustments",
            "input_schema": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": "Description of the scenario (e.g. 'hire 2 engineers')",
                    },
                    "revenue_increase": {
                        "type": "number",
                        "description": "Revenue increase as decimal (e.g. 0.1 for +10%)",
                    },
                    "revenue_amount": {
                        "type": "number",
                        "description": "Revenue increase as absolute amount",
                    },
                    "expense_increase": {
                        "type": "number",
                        "description": "Expense increase as decimal (e.g. 0.2 for +20%)",
                    },
                    "expense_amount": {
                        "type": "number",
                        "description": "Expense increase as absolute amount",
                    },
                    "months": {
                        "type": "integer",
                        "description": "Number of months to project (default: 12)",
                    },
                },
                "required": ["description"],
            },
        },
        {
            "name": "generate_report",
            "description": "Generate a financial report",
            "input_schema": {
                "type": "object",
                "properties": {
                    "report_type": {
                        "type": "string",
                        "enum": ["summary", "p&l", "board_update", "cash_flow"],
                        "description": "Type of report to generate",
                    },
                },
                "required": ["report_type"],
            },
        },
        {
            "name": "update_metrics",
            "description": "Update user financial metrics manually. Use when the user tells you their numbers directly.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "mrr": {
                        "type": "number",
                        "description": "Monthly recurring revenue",
                    },
                    "monthly_expenses": {
                        "type": "number",
                        "description": "Monthly expenses total",
                    },
                    "cash_balance": {
                        "type": "number",
                        "description": "Current cash balance",
                    },
                    "company_name": {
                        "type": "string",
                        "description": "Company name",
                    },
                    "startup_stage": {
                        "type": "string",
                        "enum": ["pre-revenue", "early", "scaling", "growth"],
                        "description": "Startup stage",
                    },
                },
                "required": [],
            },
        },
        {
            "name": "add_transaction",
            "description": "Record a new transaction manually. Use when the user mentions a specific expense or income.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Transaction date in YYYY-MM-DD format",
                    },
                    "description": {
                        "type": "string",
                        "description": "Transaction description (e.g. 'AWS bill', 'Customer payment')",
                    },
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount (positive number)",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Transaction type",
                    },
                    "category": {
                        "type": "string",
                        "description": "Category (e.g. 'SaaS', 'Salary', 'Infrastructure', 'Revenue')",
                    },
                },
                "required": ["date", "description", "amount", "type", "category"],
            },
        },
        {
            "name": "seed_demo_data",
            "description": "Load realistic demo data so user can explore the product without entering real data. Use when user says 'show me a demo' or 'demo'.",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
        {
            "name": "clear_demo_data",
            "description": "Remove demo data when user is ready to use their real financial data.",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    ]


async def execute_tool(
    tool_name: str,
    tool_input: dict,
    db: AsyncSession,
    user_id: str,
    supabase_url: Optional[str] = None,
    supabase_key: Optional[str] = None,
) -> dict:
    """Execute a tool and return results."""
    try:
        if tool_name == "get_metrics":
            return await get_metrics(db, user_id, supabase_url, supabase_key)

        elif tool_name == "get_transactions":
            limit = tool_input.get("limit", 20)
            category = tool_input.get("category")
            return {
                "transactions": await get_transactions(db, user_id, limit, category),
                "count": len(await get_transactions(db, user_id, limit, category)),
            }

        elif tool_name == "run_scenario":
            metrics = await get_metrics(db, user_id, supabase_url, supabase_key)
            description = tool_input.get("description", "Unnamed scenario")
            adjustments = {k: v for k, v in tool_input.items() if k != "description"}
            return await run_scenario(metrics, description, adjustments)

        elif tool_name == "generate_report":
            report_type = tool_input.get("report_type", "summary")
            return await generate_report(db, user_id, report_type)

        elif tool_name == "update_metrics":
            if not supabase_url or not supabase_key:
                return {"error": "Supabase credentials not configured"}
            return await update_metrics(supabase_url, supabase_key, user_id, tool_input)

        elif tool_name == "add_transaction":
            if not supabase_url or not supabase_key:
                return {"error": "Supabase credentials not configured"}
            return await add_transaction(supabase_url, supabase_key, user_id, tool_input)

        elif tool_name == "seed_demo_data":
            if not supabase_url or not supabase_key:
                return {"error": "Supabase credentials not configured"}
            return await seed_demo_data(supabase_url, supabase_key, user_id)

        elif tool_name == "clear_demo_data":
            if not supabase_url or not supabase_key:
                return {"error": "Supabase credentials not configured"}
            return await clear_demo_data(supabase_url, supabase_key, user_id)

        else:
            return {"error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        return {"error": f"Tool execution error: {str(e)}"}


async def stream_chat(
    messages: list[dict],
    user: User,
    db: AsyncSession,
    supabase_url: Optional[str] = None,
    supabase_key: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream chat response from Claude with tool support.
    Yields SSE events as JSON strings.
    """
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        yield f'data: {json.dumps({"type": "error", "message": "Claude API key not configured"})}\n\n'
        return

    # Build system prompt with real financial context
    system_prompt = build_system_prompt()

    # If Supabase credentials available, build and inject financial context
    if supabase_url and supabase_key:
        try:
            context = await build_financial_context(supabase_url, supabase_key, user.id)
            formatted_context = format_context_for_prompt(context)
            system_prompt = build_system_prompt(financial_snapshot=formatted_context)
        except Exception as e:
            print(f"Warning: Could not build financial context: {e}")

    # Prepare tool definitions
    tools = get_tool_definitions()

    # Initial request to Claude
    messages_with_roles = [{"role": msg["role"], "content": msg["content"]} for msg in messages]

    claude_request = {
        "model": CLAUDE_MODEL,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": messages_with_roles,
        "tools": tools,
    }

    conversation_messages = messages_with_roles.copy()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CLAUDE_API_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": CLAUDE_API_VERSION,
                    "content-type": "application/json",
                },
                json=claude_request,
                timeout=60.0,
            )

            if response.status_code != 200:
                error_detail = response.text()
                yield f'data: {json.dumps({"type": "error", "message": f"Claude API error: {error_detail}"})}\n\n'
                return

            # Process streaming response
            async for line in response.aiter_lines():
                if not line.strip():
                    continue

                if line.startswith("data:"):
                    try:
                        event = json.loads(line[5:].strip())

                        if event.get("type") == "content_block_delta":
                            delta = event.get("delta", {})
                            if delta.get("type") == "text_delta":
                                text = delta.get("text", "")
                                if text:
                                    yield f'data: {json.dumps({"type": "text_delta", "content": text})}\n\n'

                        elif event.get("type") == "content_block_start":
                            content_block = event.get("content_block", {})
                            if content_block.get("type") == "tool_use":
                                # Tool use block starting
                                pass

                        elif event.get("type") == "message_delta":
                            # Message ending
                            pass

                        elif event.get("type") == "message_stop":
                            # Full message received
                            pass

                    except json.JSONDecodeError:
                        pass

    except Exception as e:
        yield f'data: {json.dumps({"type": "error", "message": f"Streaming error: {str(e)}"})}\n\n'


async def stream_chat_with_tools(
    messages: list[dict],
    user: User,
    db: AsyncSession,
    supabase_url: Optional[str] = None,
    supabase_key: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream chat with agentic tool looping.
    Handles tool calls and re-prompts Claude until done.
    Injects real-time financial context into the system prompt.
    """
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        yield f'data: {json.dumps({"type": "error", "message": "Claude API key not configured"})}\n\n'
        return

    # Build system prompt with real financial context
    system_prompt = build_system_prompt()
    tools = get_tool_definitions()

    # Check onboarding state and inject onboarding-specific prompt if needed
    onboarding_state = None
    if supabase_url and supabase_key:
        try:
            onboarding_state = await get_onboarding_state(supabase_url, supabase_key, user.id)
            onboarding_addition = get_onboarding_system_prompt_addition(onboarding_state)
            if onboarding_addition:
                system_prompt += f"\n\n{onboarding_addition}"
        except Exception as e:
            print(f"Warning: Could not check onboarding state: {e}")

    # If Supabase credentials available, build and inject financial context
    if supabase_url and supabase_key:
        try:
            context = await build_financial_context(supabase_url, supabase_key, user.id)
            formatted_context = format_context_for_prompt(context)
            system_prompt = build_system_prompt(financial_snapshot=formatted_context)

            # Re-inject onboarding prompt if it was set
            if onboarding_state:
                onboarding_addition = get_onboarding_system_prompt_addition(onboarding_state)
                if onboarding_addition:
                    system_prompt += f"\n\n{onboarding_addition}"
        except Exception as e:
            print(f"Warning: Could not build financial context: {e}")
            # Fall back to basic system prompt
            pass

    # Convert input messages to Claude format
    conversation_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]

    # Agentic loop
    while True:
        claude_request = {
            "model": CLAUDE_MODEL,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": conversation_messages,
            "tools": tools,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    CLAUDE_API_URL,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": CLAUDE_API_VERSION,
                        "content-type": "application/json",
                    },
                    json=claude_request,
                    timeout=60.0,
                )

                if response.status_code != 200:
                    error_detail = response.text()
                    yield f'data: {json.dumps({"type": "error", "message": f"Claude API error: {error_detail}"})}\n\n'
                    return

                # Collect full response
                full_response = response.json()
                assistant_content = full_response.get("content", [])

                # Extract token usage for tracking (fire-and-forget)
                usage_data = full_response.get("usage", {})
                input_tokens = usage_data.get("input_tokens", 0)
                output_tokens = usage_data.get("output_tokens", 0)

                # Track usage asynchronously (fire-and-forget)
                if supabase_url and supabase_key and (input_tokens > 0 or output_tokens > 0):
                    # Use provided conversation ID or generate one
                    conv_id = conversation_id or str(user.id)
                    try:
                        # Track usage without awaiting - fire and forget
                        import asyncio
                        asyncio.create_task(track_usage(
                            supabase_url, supabase_key, user.id, conv_id,
                            input_tokens, output_tokens, CLAUDE_MODEL
                        ))
                    except Exception as e:
                        print(f"Warning: Could not track usage: {e}")

                # Check if we have tool use
                has_tool_use = any(block.get("type") == "tool_use" for block in assistant_content)

                # Stream text content to user
                text_content = ""
                for block in assistant_content:
                    if block.get("type") == "text":
                        text = block.get("text", "")
                        if text:
                            text_content += text
                            yield f'data: {json.dumps({"type": "text_delta", "content": text})}\n\n'

                # If no tool use, we're done
                if not has_tool_use:
                    # Extract suggestions from response if present
                    if "suggestions" in text_content.lower():
                        # Simple heuristic: look for JSON in the text
                        import re
                        json_match = re.search(r'\[.*?\]', text_content, re.DOTALL)
                        if json_match:
                            try:
                                suggestions = json.loads(json_match.group())
                                yield f'data: {json.dumps({"type": "suggestions", "chips": suggestions})}\n\n'
                            except json.JSONDecodeError:
                                pass

                    yield f'data: {json.dumps({"type": "done"})}\n\n'
                    break

                # Add assistant response to conversation
                conversation_messages.append({
                    "role": "assistant",
                    "content": assistant_content,
                })

                # Process tool calls
                tool_results = []
                for block in assistant_content:
                    if block.get("type") == "tool_use":
                        tool_name = block.get("name")
                        tool_input = block.get("input", {})
                        tool_use_id = block.get("id")

                        # Execute the tool
                        result = await execute_tool(
                            tool_name, tool_input, db, user.id,
                            supabase_url, supabase_key
                        )

                        # Emit tool result as card
                        yield f'data: {json.dumps({"type": "card", "card_type": tool_name, "data": result})}\n\n'

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(result),
                        })

                # Add tool results to conversation
                if tool_results:
                    conversation_messages.append({
                        "role": "user",
                        "content": tool_results,
                    })

        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "message": f"Error: {str(e)}"})}\n\n'
            return


class TrackFeatureRequest(BaseModel):
    feature: str


@router.post("/track-feature")
async def track_feature(
    payload: TrackFeatureRequest,
    user: User = Depends(require_user),
):
    """
    Track feature usage for analytics and suggestion generation.

    Request body:
    {
        "feature": "scenarios_run" | "reports_generated" | "csvs_uploaded" | "transactions_viewed"
    }

    Response:
    {
        "success": bool
    }
    """
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    supabase_key = getattr(settings, "SUPABASE_SERVICE_KEY", None)

    if not supabase_url or not supabase_key:
        return {"success": False}

    feature = payload.feature
    if not feature:
        return {"success": False}

    success = await track_feature_usage(supabase_url, supabase_key, user.id, feature)
    return {"success": success}


@router.get("/onboarding")
async def get_onboarding(
    user: User = Depends(require_user),
):
    """
    Get user's onboarding state and contextual suggestions.

    Response:
    {
        "state": {
            "is_new_user": bool,
            "has_metrics": bool,
            "has_transactions": bool,
            "has_conversations": bool,
            "onboarding_step": 0-3
        },
        "suggestions": ["suggestion1", "suggestion2", ...]
    }
    """
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    supabase_key = getattr(settings, "SUPABASE_SERVICE_KEY", None)

    if not supabase_url or not supabase_key:
        return {
            "state": {
                "is_new_user": True,
                "has_metrics": False,
                "has_transactions": False,
                "has_conversations": False,
                "onboarding_step": 0,
            },
            "suggestions": get_onboarding_suggestions({
                "is_new_user": True,
                "onboarding_step": 0,
            }),
        }

    try:
        state = await get_onboarding_state(supabase_url, supabase_key, user.id)
        suggestions = get_onboarding_suggestions(state)
        return {
            "state": state,
            "suggestions": suggestions,
        }
    except Exception as e:
        print(f"Error getting onboarding state: {e}")
        return {
            "state": {
                "is_new_user": True,
                "has_metrics": False,
                "has_transactions": False,
                "has_conversations": False,
                "onboarding_step": 0,
            },
            "suggestions": get_onboarding_suggestions({
                "is_new_user": True,
                "onboarding_step": 0,
            }),
        }


@router.post("/")
async def chat(
    request: ChatRequest,
    http_request: Request,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream chat endpoint with Claude AI CFO.
    Uses SSE (Server-Sent Events) for streaming responses.

    Request body:
    {
        "messages": [{"role": "user", "content": "What's my runway?"}],
        "conversation_id": "optional-id"
    }

    Response: SSE stream with events:
    - {"type": "text_delta", "content": "..."}
    - {"type": "card", "card_type": "metrics", "data": {...}}
    - {"type": "suggestions", "chips": [...]}
    - {"type": "done"}
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="At least one message required")

    # Verify Anthropic API key is configured
    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please contact support.",
        )

    # Sanitize and validate messages
    messages = []
    for msg in request.messages:
        content = sanitize_chat_input(msg.content)
        if not content:
            continue
        messages.append({"role": msg.role, "content": content})

    if not messages:
        raise HTTPException(status_code=400, detail="At least one valid message required")

    # Get Supabase credentials from settings
    supabase_url = getattr(settings, "SUPABASE_URL", None)
    supabase_key = getattr(settings, "SUPABASE_SERVICE_KEY", None)

    return StreamingResponse(
        stream_chat_with_tools(messages, user, db, supabase_url, supabase_key, request.conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
