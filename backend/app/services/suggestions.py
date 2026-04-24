"""
Evolving Suggestion Chips Generator for Raven.
Generates contextual suggestion chips based on data signals, history signals, and gap signals.
"""

import httpx
import json
from datetime import datetime, timedelta, date
from typing import Optional, Dict, List
from collections import defaultdict
from .metrics import fetch_from_supabase, compute_all_metrics


async def track_feature_usage(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    feature: str,
) -> bool:
    """
    Track which features user has used.

    Supported features:
    - scenarios_run
    - reports_generated
    - csvs_uploaded
    - transactions_viewed

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        feature: Feature name to track

    Returns:
        True if successful, False otherwise
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Fetch current metadata
    url = f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=metadata"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                users = response.json()
                if not users:
                    return False

                metadata = users[0].get("metadata", {})
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                # Initialize feature_usage if not present
                if "feature_usage" not in metadata:
                    metadata["feature_usage"] = {}

                # Increment feature counter
                if feature not in metadata["feature_usage"]:
                    metadata["feature_usage"][feature] = 0
                metadata["feature_usage"][feature] += 1

                # Update user metadata
                update_url = f"{supabase_url}/rest/v1/users?id=eq.{user_id}"
                response = await client.patch(
                    update_url,
                    headers=headers,
                    json={"metadata": metadata},
                )
                return response.status_code in [200, 204]

    except Exception as e:
        print(f"Error tracking feature usage: {e}")

    return False


async def get_feature_usage(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Get user's feature usage stats.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID

    Returns:
        Dict with feature usage counts
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    url = f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=metadata"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                users = response.json()
                if users:
                    metadata = users[0].get("metadata", {})
                    if isinstance(metadata, str):
                        metadata = json.loads(metadata)
                    return metadata.get("feature_usage", {})
    except Exception as e:
        print(f"Error fetching feature usage: {e}")

    return {}


async def get_recent_messages(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    limit: int = 20,
) -> list:
    """
    Fetch recent chat messages to detect user patterns.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        limit: Number of messages to fetch

    Returns:
        List of message dicts
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Try to fetch from messages or conversations table
    url = f"{supabase_url}/rest/v1/messages?user_id=eq.{user_id}&limit={limit}&order=created_at.desc"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error fetching messages: {e}")

    return []


def detect_data_signals(metrics: dict, current_month: str, transactions: list) -> List[str]:
    """
    Detect data signals based on recent transactions and metric changes.

    Args:
        metrics: Current metrics dict
        current_month: Current month in YYYY-MM format
        transactions: List of recent transactions

    Returns:
        List of suggestion chips based on data signals
    """
    signals = []

    # Check for new transactions this week
    today = date.today()
    week_ago = today - timedelta(days=7)
    recent_txns = [
        t for t in transactions
        if isinstance(t.get("date"), str) and t["date"][:10] >= week_ago.isoformat()
    ]

    if recent_txns:
        signals.append("Review this week's expenses")

    # Check for revenue changes
    revenue_change = metrics.get("mom_revenue_growth_pct", 0)
    if abs(revenue_change) > 5:  # More than 5% change
        signals.append("What's driving MRR change?")

    # Check for month boundary (close to end or just started)
    day_of_month = today.day
    if day_of_month <= 3 or day_of_month >= 28:
        signals.append("How did last month compare?")

    return signals


def detect_history_signals(messages: list) -> List[str]:
    """
    Detect history signals based on user's recent message patterns.

    Args:
        messages: List of recent message dicts with 'content' field

    Returns:
        List of suggestion chips based on frequently asked topics
    """
    signals = []

    # Look for keywords in recent messages
    message_text = " ".join([msg.get("content", "").lower() for msg in messages])

    # Common patterns
    if "runway" in message_text:
        signals.append("Update my runway forecast")
    if "scenario" in message_text or "what if" in message_text:
        signals.append("Run another hiring scenario")
    if "expense" in message_text or "cost" in message_text:
        signals.append("Deep dive: my expenses")
    if "revenue" in message_text or "mrr" in message_text:
        signals.append("Revenue growth strategies")

    return signals


def detect_gap_signals(feature_usage: dict) -> List[tuple[str, bool]]:
    """
    Detect gap signals based on unused features.

    Returns suggestions for features user hasn't tried yet.

    Args:
        feature_usage: Dict of feature usage counts

    Returns:
        List of tuples: (suggestion_text, is_new_feature)
        is_new_feature = True means this feature hasn't been used
    """
    signals = []

    # Features user hasn't tried
    if feature_usage.get("scenarios_run", 0) == 0:
        signals.append(("What if I raise prices 20%?", True))

    if feature_usage.get("reports_generated", 0) == 0:
        signals.append(("Draft a board update", True))

    if feature_usage.get("csvs_uploaded", 0) == 0:
        signals.append(("Upload bank statement", True))

    if feature_usage.get("transactions_viewed", 0) == 0:
        signals.append(("Show my transaction history", True))

    return signals


async def generate_suggestions(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    current_context: Optional[dict] = None,
) -> List[Dict[str, any]]:
    """
    Generate contextual suggestion chips based on three signal types:
    1. Data signals (what changed in transactions/metrics)
    2. History signals (what user asks about often)
    3. Gap signals (features not yet used)

    Returns exactly 4 chips, with at most 1 gap chip.
    Gap chips include is_new: true flag for green dot indicator.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        current_context: Optional dict with current metrics and transactions

    Returns:
        List of suggestion dicts: [{ text: str, is_new?: bool }, ...]
    """

    # Get current date
    today = date.today()
    current_month = today.strftime("%Y-%m")

    # Fetch metrics if not provided
    if current_context:
        metrics = current_context.get("metrics", {})
        transactions = current_context.get("transactions", [])
    else:
        metrics = await compute_all_metrics(supabase_url, supabase_key, user_id)
        transactions = await fetch_from_supabase(
            supabase_url, supabase_key, "transactions", user_id,
            order="date.desc", limit=50
        )

    # Fetch recent messages for history signals
    messages = await get_recent_messages(supabase_url, supabase_key, user_id, limit=20)

    # Fetch feature usage
    feature_usage = await get_feature_usage(supabase_url, supabase_key, user_id)

    # Generate signals
    data_signals = detect_data_signals(metrics, current_month, transactions)
    history_signals = detect_history_signals(messages)
    gap_signals = detect_gap_signals(feature_usage)

    # Combine signals, prioritizing data > history > gap
    suggestions = []

    # Add data signals (max 2)
    for signal in data_signals[:2]:
        suggestions.append({"text": signal, "is_new": False})

    # Add history signals (max 2)
    for signal in history_signals[:2]:
        suggestions.append({"text": signal, "is_new": False})

    # Add gap signals (max 1, marked as new)
    if gap_signals:
        gap_text, is_new = gap_signals[0]
        suggestions.append({"text": gap_text, "is_new": is_new})

    # Ensure exactly 4 suggestions
    while len(suggestions) < 4:
        # Fallback generic suggestions if we don't have enough
        fallback = [
            {"text": "Show me my dashboard", "is_new": False},
            {"text": "What's my P&L?", "is_new": False},
            {"text": "Cash flow analysis", "is_new": False},
            {"text": "Team headcount forecast", "is_new": False},
        ]
        for item in fallback:
            if item not in suggestions and len(suggestions) < 4:
                suggestions.append(item)

    # Return exactly 4
    return suggestions[:4]
