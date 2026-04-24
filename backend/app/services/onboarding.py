"""
Onboarding state detection and management for new users.
Determines user's onboarding step and provides contextual prompts.
"""

import httpx
from typing import Optional


async def get_onboarding_state(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Detect user's onboarding state based on data they've entered.

    Returns:
        Dict with:
        - is_new_user: True if brand new (no data at all)
        - has_metrics: True if user has any metrics entered
        - has_transactions: True if user has any transactions
        - has_conversations: True if user has had at least one chat interaction
        - onboarding_step: 0-3 integer indicating progress
            * 0: Brand new (no data at all)
            * 1: Has metrics but no transactions
            * 2: Has transactions but no conversations
            * 3: Complete (has had at least one conversation with real data)
    """

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Check for transactions
    transactions_url = f"{supabase_url}/rest/v1/transactions?user_id=eq.{user_id}&limit=1"
    has_transactions = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(transactions_url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                has_transactions = len(data) > 0
    except Exception as e:
        print(f"Error checking transactions: {e}")

    # Check for metrics (if we add a metrics table later)
    has_metrics = has_transactions  # For now, having transactions means having metrics

    # Check for conversations
    conversations_url = f"{supabase_url}/rest/v1/conversations?user_id=eq.{user_id}&limit=1"
    has_conversations = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(conversations_url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                has_conversations = len(data) > 0
    except Exception as e:
        print(f"Error checking conversations: {e}")

    # Determine onboarding step
    is_new_user = not has_transactions and not has_conversations

    if is_new_user:
        onboarding_step = 0
    elif has_transactions and not has_conversations:
        onboarding_step = 2
    elif has_conversations:
        onboarding_step = 3
    else:
        # has_metrics but no transactions
        onboarding_step = 1

    return {
        "is_new_user": is_new_user,
        "has_metrics": has_metrics,
        "has_transactions": has_transactions,
        "has_conversations": has_conversations,
        "onboarding_step": onboarding_step,
    }


def get_onboarding_system_prompt_addition(state: dict) -> str:
    """
    Return additional system prompt text based on onboarding state.

    Args:
        state: Dict from get_onboarding_state()

    Returns:
        String to append to base system prompt
    """

    step = state.get("onboarding_step", 0)

    if step == 0:
        return """
ONBOARDING CONTEXT: This is a brand new user with NO financial data at all.

Your FIRST message should:
1. Give a warm, personal greeting (use their name if available)
2. Introduce yourself as their AI CFO in 1-2 sentences
3. Explain what you can help with
4. Ask them to either:
   a) Upload a bank statement CSV (easiest), OR
   b) Tell you their 3 key numbers: monthly revenue, monthly expenses, cash in bank
5. Offer a "Show me a demo" option to see the product in action first

Keep it conversational and low-pressure. End with an onboarding progress card showing the 3 steps.
Include these suggestion chips: ["Upload a bank statement", "I'll type in my numbers", "Show me a demo first", "What can you do?"]"""

    elif step == 1:
        return """
ONBOARDING CONTEXT: This user has entered some basic metrics but NO transactions yet.

Your response should:
1. Acknowledge their numbers warmly
2. Show a metrics card with what they've shared
3. Suggest uploading a CSV to see real transaction data, OR entering more transactions manually
4. Mention that real data unlocks powerful analysis features

Include these suggestion chips: ["Upload transactions CSV", "What's my runway?", "Add an expense", "Show me a scenario"]"""

    elif step == 2:
        return """
ONBOARDING CONTEXT: This user has transaction data but hasn't asked their first question yet.

Your response should:
1. Proactively analyze their data without waiting for a question
2. Mention top expense categories, compute their burn rate, runway
3. Flag anything interesting or noteworthy
4. End with 3-4 follow-up questions as suggestion chips

This is the key moment to hook them on the product's value.

Include these suggestion chips: ["What's my burn rate trend?", "Any expenses to watch?", "Draft a board update", "Run a hiring scenario"]"""

    else:
        # Step 3+: normal, no special instruction needed
        return ""


def get_onboarding_suggestions(state: dict) -> list[str]:
    """
    Return contextual suggestion chips based on onboarding state.

    Args:
        state: Dict from get_onboarding_state()

    Returns:
        List of suggested follow-up questions as strings
    """

    step = state.get("onboarding_step", 0)

    if step == 0:
        return [
            "Upload a bank statement",
            "I'll type in my numbers",
            "Show me a demo first",
            "What can you do?",
        ]
    elif step == 1:
        return [
            "Upload transactions CSV",
            "What's my runway?",
            "Add an expense",
            "Show me a scenario",
        ]
    elif step == 2:
        return [
            "What's my burn rate trend?",
            "Any expenses to watch?",
            "Draft a board update",
            "Run a hiring scenario",
        ]
    else:
        # Step 3+: no onboarding suggestions, use normal contextual chips from AI
        return []
