"""
Financial Context Builder for Raven System Prompt.
Builds the financial snapshot injected into Claude's system prompt.
Includes in-memory caching with TTL to avoid redundant data fetches.
"""

import httpx
from typing import Optional, Dict
from datetime import datetime, timedelta
from .metrics import compute_all_metrics

# In-memory cache for financial context
# Format: { user_id: { 'data': context_dict, 'timestamp': datetime } }
_context_cache: Dict[str, Dict] = {}


async def fetch_user_metadata(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Fetch user metadata like company name, stage, etc.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID

    Returns:
        Dict with user metadata
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    url = f"{supabase_url}/rest/v1/users?id=eq.{user_id}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                users = response.json()
                if users:
                    return users[0]
    except Exception as e:
        print(f"Error fetching user metadata: {e}")

    return {}


async def fetch_recent_transactions(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    limit: int = 10,
) -> list:
    """
    Fetch the last N transactions for context.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        limit: Number of transactions to fetch

    Returns:
        List of recent transaction dicts
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    url = f"{supabase_url}/rest/v1/transactions?user_id=eq.{user_id}&limit={limit}&order=date.desc"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error fetching transactions: {e}")

    return []


async def build_financial_context(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    cache_ttl_seconds: int = 60,
) -> dict:
    """
    Build complete financial context for Claude's system prompt.
    Results are cached with a TTL to avoid redundant fetches.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        cache_ttl_seconds: Cache time-to-live in seconds (default: 60)

    Returns:
        Dict with metrics, transactions, and user metadata
    """

    # Check cache
    now = datetime.utcnow()
    if user_id in _context_cache:
        cached = _context_cache[user_id]
        cache_age = (now - cached['timestamp']).total_seconds()
        if cache_age < cache_ttl_seconds:
            return cached['data']

    # Fetch metrics
    metrics = await compute_all_metrics(supabase_url, supabase_key, user_id)

    # Fetch recent transactions (limit to 5 to reduce token count in prompt)
    recent_transactions = await fetch_recent_transactions(
        supabase_url, supabase_key, user_id, limit=5
    )

    # Fetch user metadata
    user_metadata = await fetch_user_metadata(supabase_url, supabase_key, user_id)

    context = {
        "metrics": metrics,
        "recent_transactions": recent_transactions,
        "user_metadata": user_metadata,
        "timestamp": now,
    }

    # Store in cache
    _context_cache[user_id] = {
        'data': context,
        'timestamp': now,
    }

    return context


def invalidate_context_cache(user_id: str) -> None:
    """
    Invalidate the cached financial context for a user.
    Call this when transactions are added or metrics are updated.

    Args:
        user_id: User ID to invalidate
    """
    if user_id in _context_cache:
        del _context_cache[user_id]


def format_context_for_prompt(context: dict) -> str:
    """
    Format the financial context as readable text for the system prompt.

    Args:
        context: Dict from build_financial_context

    Returns:
        Formatted text string to inject into system prompt
    """

    metrics = context.get("metrics", {})
    recent_txns = context.get("recent_transactions", [])
    user_metadata = context.get("user_metadata", {})

    lines = ["## CURRENT FINANCIAL SNAPSHOT"]
    lines.append("")

    # Financial metrics
    mrr = metrics.get("mrr", 0)
    mom_growth = metrics.get("mom_revenue_growth_pct", 0)
    lines.append(f"**MRR**: ${mrr:,.2f} ({mom_growth:+.1f}% MoM)")

    monthly_expenses = metrics.get("monthly_expenses", 0)
    mom_expense = metrics.get("mom_expense_change_pct", 0)
    lines.append(f"**Monthly Expenses**: ${monthly_expenses:,.2f} ({mom_expense:+.1f}% MoM)")

    net_burn = metrics.get("net_burn", 0)
    if net_burn > 0:
        lines.append(f"**Net Burn**: ${net_burn:,.2f}/month (BURNING)")
    else:
        lines.append(f"**Net Burn**: ${abs(net_burn):,.2f}/month (PROFITABLE)")

    cash_balance = metrics.get("cash_balance", 0)
    lines.append(f"**Cash Balance**: ${cash_balance:,.2f}")

    runway = metrics.get("runway_months")
    if runway is not None:
        if runway == float("inf"):
            lines.append(f"**Runway**: Infinite (profitable)")
        else:
            lines.append(f"**Runway**: {runway} months")

    gross_margin = metrics.get("gross_margin_pct", 0)
    lines.append(f"**Gross Margin**: {gross_margin:.1f}%")

    lines.append("")
    lines.append("## RECENT TRANSACTIONS (Last 5)")

    if recent_txns:
        for txn in recent_txns[:5]:
            date_str = txn.get("date", "")[:10]  # YYYY-MM-DD
            description = txn.get("description", "")
            amount = txn.get("amount", 0)
            txn_type = txn.get("type", "")

            if txn_type.lower() == "credit":
                lines.append(f"- {date_str}: {description} - +${amount:,.2f} (income)")
            else:
                lines.append(f"- {date_str}: {description} - -${amount:,.2f} (expense)")
    else:
        lines.append("- No transactions recorded yet")

    lines.append("")
    lines.append("## COMPANY CONTEXT")

    company_name = user_metadata.get("company_name", "Your Company")
    lines.append(f"**Company**: {company_name}")

    startup_stage = user_metadata.get("startup_stage", "Unknown")
    lines.append(f"**Stage**: {startup_stage}")

    return "\n".join(lines)


def inject_financial_context_into_prompt(
    base_prompt: str,
    context: dict,
) -> str:
    """
    Inject formatted financial context into a base system prompt.

    Args:
        base_prompt: The base system prompt
        context: Dict from build_financial_context

    Returns:
        Complete system prompt with injected context
    """

    formatted_context = format_context_for_prompt(context)

    # Append context to the base prompt
    return f"{base_prompt}\n\n{formatted_context}"
