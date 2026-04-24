"""
Proactive Session Analysis Engine for Raven.
Generates intelligent opening nudges when user opens the app based on metrics changes.
"""

import httpx
import json
from datetime import datetime, date
from typing import Optional, Dict, List
from .metrics import compute_all_metrics, fetch_from_supabase


async def fetch_session_snapshot(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> Optional[dict]:
    """
    Fetch the last saved session snapshot for metrics comparison.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID

    Returns:
        Dict with last session metrics or None if no snapshot exists
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Try to fetch user metadata which stores snapshot
    url = f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=metadata"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                users = response.json()
                if users and users[0].get("metadata"):
                    metadata = users[0]["metadata"]
                    if isinstance(metadata, str):
                        metadata = json.loads(metadata)
                    return metadata.get("last_session_metrics")
    except Exception as e:
        print(f"Error fetching session snapshot: {e}")

    return None


async def save_session_snapshot(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    metrics: dict,
) -> bool:
    """
    Save current metrics as a snapshot for next session comparison.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        metrics: Current metrics dict to save

    Returns:
        True if successful, False otherwise
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Prepare snapshot data
    snapshot = {
        "last_session_metrics": {
            "mrr": metrics.get("mrr", 0),
            "monthly_expenses": metrics.get("monthly_expenses", 0),
            "cash_balance": metrics.get("cash_balance", 0),
            "runway_months": metrics.get("runway_months"),
            "net_burn": metrics.get("net_burn", 0),
            "mom_revenue_growth_pct": metrics.get("mom_revenue_growth_pct", 0),
            "mom_expense_change_pct": metrics.get("mom_expense_change_pct", 0),
            "timestamp": datetime.utcnow().isoformat(),
        }
    }

    # Update user metadata
    url = f"{supabase_url}/rest/v1/users?id=eq.{user_id}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.patch(
                url,
                headers=headers,
                json={"metadata": snapshot},
            )
            return response.status_code in [200, 204]
    except Exception as e:
        print(f"Error saving session snapshot: {e}")
        return False


def get_time_greeting(user_name: Optional[str] = None) -> str:
    """
    Generate a greeting based on time of day.

    Args:
        user_name: Optional user name to personalize greeting

    Returns:
        Greeting string
    """
    now = datetime.now()
    hour = now.hour

    if hour < 12:
        greeting = "Good morning"
    elif hour < 17:
        greeting = "Good afternoon"
    else:
        greeting = "Hey"

    if user_name:
        greeting += f", {user_name}"
    else:
        greeting += "!"

    return greeting


async def generate_session_opener(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Generate intelligent opening nudges based on metrics changes.

    Analyzes current metrics vs. last session to detect:
    - Expense spikes (>20% MoM)
    - Revenue changes (significant up/down)
    - Runway warnings (<6 months)
    - Milestones (breakeven, hitting targets)
    - Calm state (no issues)

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID

    Returns:
        Dict with:
        - greeting: str (personalized greeting)
        - nudges: list of dicts with { type, message, detail, actions }
        - metrics_snapshot: dict (current metrics for next session comparison)
    """

    # Fetch current metrics
    current_metrics = await compute_all_metrics(supabase_url, supabase_key, user_id)

    # Fetch last session snapshot
    last_metrics = await fetch_session_snapshot(supabase_url, supabase_key, user_id)

    # Fetch user metadata for name
    user_metadata = await fetch_user_metadata(supabase_url, supabase_key, user_id)
    user_name = user_metadata.get("full_name") or user_metadata.get("company_name")

    # Generate greeting
    greeting = get_time_greeting(user_name)

    nudges = []

    # Only analyze if we have metrics (user has data)
    if current_metrics.get("mrr") or current_metrics.get("monthly_expenses"):
        # 1. Check for expense spikes (>20% MoM)
        expense_change = current_metrics.get("mom_expense_change_pct", 0)
        if last_metrics and expense_change > 20:
            nudges.append({
                "type": "alert",
                "message": f"Your expenses jumped {expense_change:.0f}% this month",
                "detail": f"Current: ${current_metrics.get('monthly_expenses', 0):,.0f}/mo vs. last month. Check if this is planned.",
                "actions": [
                    {"label": "Review expenses", "action": "Show my top expense categories"},
                    {"label": "Dismiss", "action": ""}
                ],
            })

        # 2. Check for runway warnings (<6 months)
        runway = current_metrics.get("runway_months")
        if runway is not None and runway != float("inf") and runway < 6:
            nudges.append({
                "type": "alert",
                "message": f"Runway is getting tight ({runway:.1f} months)",
                "detail": "At your current burn rate, you have less than 6 months of cash. Consider your options: reduce expenses, increase revenue, or secure funding.",
                "actions": [
                    {"label": "Explore scenarios", "action": "Run a scenario: what if we reduced costs by 20%?"},
                    {"label": "Details", "action": "What exactly is my runway calculation?"}
                ],
            })

        # 3. Check for revenue changes (significant up/down)
        revenue_change = current_metrics.get("mom_revenue_growth_pct", 0)
        if last_metrics:
            if revenue_change > 30:
                nudges.append({
                    "type": "insight",
                    "message": f"Great news: Revenue up {revenue_change:.0f}% this month!",
                    "detail": f"MRR: ${current_metrics.get('mrr', 0):,.0f}. What's driving this growth?",
                    "actions": [
                        {"label": "Celebrate", "action": "Break down my revenue sources"},
                    ],
                })
            elif revenue_change < -20:
                nudges.append({
                    "type": "alert",
                    "message": f"Revenue dropped {abs(revenue_change):.0f}% this month",
                    "detail": f"MRR: ${current_metrics.get('mrr', 0):,.0f}. Let's figure out what changed.",
                    "actions": [
                        {"label": "Investigate", "action": "Why is my revenue down this month?"},
                    ],
                })

        # 4. Check for breakeven/profitability milestone
        net_burn = current_metrics.get("net_burn", 0)
        last_net_burn = last_metrics.get("net_burn", 0) if last_metrics else None
        if last_net_burn is not None and last_net_burn > 0 and net_burn <= 0:
            nudges.append({
                "type": "insight",
                "message": "Profitability milestone reached!",
                "detail": "You're no longer burning cash month-to-month. Great progress!",
                "actions": [
                    {"label": "View metrics", "action": "Show me my full financial summary"},
                ],
            })

        # 5. Calm state - if no urgent nudges, show positive summary
        if len(nudges) == 0:
            cash = current_metrics.get("cash_balance", 0)
            mrr = current_metrics.get("mrr", 0)
            nudges.append({
                "type": "tip",
                "message": "Your numbers look stable.",
                "detail": f"Cash: ${cash:,.0f} | MRR: ${mrr:,.0f} | Runway: {runway if runway != float('inf') else 'Infinite'} months",
                "actions": [],
            })

    # Limit to 1-3 nudges, ranked by urgency (alerts first, then insights)
    alert_nudges = [n for n in nudges if n["type"] == "alert"]
    insight_nudges = [n for n in nudges if n["type"] == "insight"]
    tip_nudges = [n for n in nudges if n["type"] == "tip"]

    final_nudges = alert_nudges[:1] + insight_nudges[:1] + tip_nudges[:1]
    final_nudges = final_nudges[:3]

    # Save current metrics as snapshot for next session
    await save_session_snapshot(supabase_url, supabase_key, user_id, current_metrics)

    return {
        "greeting": greeting,
        "nudges": final_nudges,
        "metrics_snapshot": current_metrics,
    }


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
