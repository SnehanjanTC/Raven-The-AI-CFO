"""
Metrics Computation Engine for Raven.
Computes financial metrics from raw transaction data in Supabase.
"""

import httpx
import json
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict
from collections import defaultdict


async def fetch_from_supabase(
    supabase_url: str,
    supabase_key: str,
    table: str,
    user_id: str,
    filters: Optional[Dict] = None,
    limit: Optional[int] = None,
    order: Optional[str] = None,
) -> list:
    """
    Generic Supabase REST API fetch with filtering and ordering.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        table: Table name to query
        user_id: User ID for filtering
        filters: Optional dict with additional filter conditions
        limit: Optional limit on results
        order: Optional order clause (e.g., "date.desc")

    Returns:
        List of records from Supabase
    """
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    # Build query string
    query_parts = [f"user_id=eq.{user_id}"]

    if filters:
        for key, value in filters.items():
            if isinstance(value, str):
                query_parts.append(f"{key}=eq.{value}")
            elif isinstance(value, (int, float)):
                query_parts.append(f"{key}=eq.{value}")

    if order:
        query_parts.append(f"order={order}")

    if limit:
        query_parts.append(f"limit={limit}")

    query_string = "&".join(query_parts)
    url = f"{supabase_url}/rest/v1/{table}?{query_string}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Supabase query error: {response.status_code} {response.text}")
                return []
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
        return []


async def compute_all_metrics(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> dict:
    """
    Compute all financial metrics from raw transaction data.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID to compute metrics for

    Returns:
        Dict with computed metrics including MRR, expenses, burn rate, runway, etc.
    """

    # Fetch all transactions for the user
    transactions = await fetch_from_supabase(
        supabase_url, supabase_key, "transactions", user_id,
        order="date.desc"
    )

    if not transactions:
        # Return zeroed-out metrics for new users
        return {
            "mrr": 0,
            "arr": 0,
            "monthly_expenses": 0,
            "gross_burn": 0,
            "net_burn": 0,
            "cash_balance": 0,
            "runway_months": None,
            "mom_revenue_growth_pct": 0,
            "mom_expense_change_pct": 0,
            "gross_margin_pct": 0,
            "net_margin_pct": 0,
            "last_updated": datetime.utcnow().isoformat(),
        }

    # Get current month and last month
    today = date.today()
    current_month = today.strftime("%Y-%m")
    last_month = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

    # Categories for revenue classification
    REVENUE_KEYWORDS = {'revenue', 'subscription', 'recurring', 'stripe', 'payment', 'customer', 'sales', 'income'}
    NON_REVENUE_KEYWORDS = {'refund', 'loan', 'grant', 'investment', 'capital', 'owner contribution', 'interest', 'tax'}
    COGS_KEYWORDS = {'cogs', 'cost of goods', 'cost of revenue', 'cost of services', 'infrastructure', 'cloud', 'hosting', 'data costs', 'fulfillment', 'shipping', 'merchant fees'}

    def _is_revenue(txn: dict) -> bool:
        """Check if transaction is revenue."""
        if txn.get("type", "").lower() != "credit":
            return False
        cat = (txn.get("category", "") or "").lower()
        # Check if it's explicitly not revenue
        if any(keyword in cat for keyword in NON_REVENUE_KEYWORDS):
            return False
        # Check if it looks like revenue
        return any(keyword in cat for keyword in REVENUE_KEYWORDS) or len(cat) == 0

    def _is_expense(txn: dict) -> bool:
        """Check if transaction is expense."""
        return txn.get("type", "").lower() == "debit"

    def _is_cogs(txn: dict) -> bool:
        """Check if transaction is COGS."""
        if not _is_expense(txn):
            return False
        cat = (txn.get("category", "") or "").lower()
        return any(keyword in cat for keyword in COGS_KEYWORDS)

    # Group transactions by month
    monthly_revenue = defaultdict(float)
    monthly_expenses = defaultdict(float)
    total_revenue = 0
    total_expenses = 0
    total_cogs = 0

    for txn in transactions:
        try:
            # Parse date
            txn_date_str = txn.get("date")
            if isinstance(txn_date_str, str):
                txn_date = datetime.fromisoformat(txn_date_str).date()
            else:
                txn_date = txn_date_str

            month_key = txn_date.strftime("%Y-%m")
            amount = float(txn.get("amount", 0))

            if _is_revenue(txn):
                monthly_revenue[month_key] += amount
                total_revenue += amount

            if _is_expense(txn):
                monthly_expenses[month_key] += amount
                total_expenses += amount
                if _is_cogs(txn):
                    total_cogs += amount

        except (ValueError, TypeError, AttributeError) as e:
            print(f"Error processing transaction {txn}: {e}")
            continue

    # Get current and previous month values
    current_mrr = monthly_revenue.get(current_month, 0)
    previous_mrr = monthly_revenue.get(last_month, 0)
    current_expenses = monthly_expenses.get(current_month, 0)
    previous_expenses = monthly_expenses.get(last_month, 0)

    # Calculate growth rates
    mom_revenue_growth_pct = 0
    if previous_mrr > 0:
        mom_revenue_growth_pct = ((current_mrr - previous_mrr) / previous_mrr) * 100

    mom_expense_change_pct = 0
    if previous_expenses > 0:
        mom_expense_change_pct = ((current_expenses - previous_expenses) / previous_expenses) * 100

    # Calculate margins
    gross_margin_pct = 0
    net_margin_pct = 0
    if total_revenue > 0:
        gross_margin_pct = ((total_revenue - total_cogs) / total_revenue) * 100
        net_margin_pct = ((total_revenue - total_expenses) / total_revenue) * 100

    # Net and gross burn
    net_burn = current_expenses - current_mrr  # Positive = burning, Negative = profitable
    gross_burn = current_expenses

    # Estimate cash balance (simple: total_revenue - total_expenses)
    # In a real system, you'd fetch from a separate balance sheet
    cash_balance = total_revenue - total_expenses
    if cash_balance < 0:
        cash_balance = 0

    # Calculate runway (months of cash left at current burn rate)
    runway_months = None
    if net_burn > 0 and cash_balance > 0:
        runway_months = round(cash_balance / net_burn, 1)
    elif net_burn <= 0 and cash_balance > 0:
        # Profitable - infinite runway
        runway_months = float("inf")

    # ARR
    arr = current_mrr * 12

    return {
        "mrr": round(current_mrr, 2),
        "arr": round(arr, 2),
        "monthly_expenses": round(current_expenses, 2),
        "gross_burn": round(gross_burn, 2),
        "net_burn": round(net_burn, 2),
        "cash_balance": round(cash_balance, 2),
        "runway_months": runway_months,
        "mom_revenue_growth_pct": round(mom_revenue_growth_pct, 1),
        "mom_expense_change_pct": round(mom_expense_change_pct, 1),
        "gross_margin_pct": round(gross_margin_pct, 1),
        "net_margin_pct": round(net_margin_pct, 1),
        "total_revenue": round(total_revenue, 2),
        "total_expenses": round(total_expenses, 2),
        "total_cogs": round(total_cogs, 2),
        "last_updated": datetime.utcnow().isoformat(),
    }


async def compute_monthly_series(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    months: int = 12,
) -> list:
    """
    Compute monthly revenue + expenses for the last N months.
    Useful for charting trends.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID
        months: Number of months to include

    Returns:
        List of dicts: [{month: "2026-01", revenue: 24000, expenses: 18000, net: 6000}, ...]
    """

    transactions = await fetch_from_supabase(
        supabase_url, supabase_key, "transactions", user_id,
        order="date.asc"
    )

    if not transactions:
        return []

    REVENUE_KEYWORDS = {'revenue', 'subscription', 'recurring', 'stripe', 'payment', 'customer', 'sales', 'income'}
    NON_REVENUE_KEYWORDS = {'refund', 'loan', 'grant', 'investment', 'capital', 'owner contribution', 'interest', 'tax'}

    def _is_revenue(txn: dict) -> bool:
        if txn.get("type", "").lower() != "credit":
            return False
        cat = (txn.get("category", "") or "").lower()
        if any(keyword in cat for keyword in NON_REVENUE_KEYWORDS):
            return False
        return any(keyword in cat for keyword in REVENUE_KEYWORDS) or len(cat) == 0

    def _is_expense(txn: dict) -> bool:
        return txn.get("type", "").lower() == "debit"

    monthly_data = defaultdict(lambda: {"revenue": 0, "expenses": 0})

    for txn in transactions:
        try:
            txn_date_str = txn.get("date")
            if isinstance(txn_date_str, str):
                txn_date = datetime.fromisoformat(txn_date_str).date()
            else:
                txn_date = txn_date_str

            month_key = txn_date.strftime("%Y-%m")
            amount = float(txn.get("amount", 0))

            if _is_revenue(txn):
                monthly_data[month_key]["revenue"] += amount
            elif _is_expense(txn):
                monthly_data[month_key]["expenses"] += amount

        except (ValueError, TypeError, AttributeError) as e:
            print(f"Error processing transaction {txn}: {e}")
            continue

    # Sort by month and get last N months
    sorted_months = sorted(monthly_data.keys())
    if len(sorted_months) > months:
        sorted_months = sorted_months[-months:]

    result = []
    for month in sorted_months:
        data = monthly_data[month]
        result.append({
            "month": month,
            "revenue": round(data["revenue"], 2),
            "expenses": round(data["expenses"], 2),
            "net": round(data["revenue"] - data["expenses"], 2),
        })

    return result


async def get_expense_breakdown(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
) -> list:
    """
    Group current month expenses by category.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service key
        user_id: User ID

    Returns:
        List of dicts: [{category: "SaaS", amount: 4200, percentage: 23}, ...]
    """

    transactions = await fetch_from_supabase(
        supabase_url, supabase_key, "transactions", user_id,
        order="date.desc"
    )

    if not transactions:
        return []

    # Get current month
    today = date.today()
    current_month = today.strftime("%Y-%m")

    # Group current month expenses by category
    category_expenses = defaultdict(float)
    total_expenses = 0

    for txn in transactions:
        try:
            txn_date_str = txn.get("date")
            if isinstance(txn_date_str, str):
                txn_date = datetime.fromisoformat(txn_date_str).date()
            else:
                txn_date = txn_date_str

            month_key = txn_date.strftime("%Y-%m")

            if month_key == current_month and txn.get("type", "").lower() == "debit":
                amount = float(txn.get("amount", 0))
                category = txn.get("category", "Other") or "Other"
                category_expenses[category] += amount
                total_expenses += amount

        except (ValueError, TypeError, AttributeError) as e:
            print(f"Error processing transaction {txn}: {e}")
            continue

    if total_expenses == 0:
        return []

    # Convert to list and calculate percentages
    result = []
    for category, amount in sorted(category_expenses.items(), key=lambda x: x[1], reverse=True):
        percentage = (amount / total_expenses) * 100
        result.append({
            "category": category,
            "amount": round(amount, 2),
            "percentage": round(percentage, 1),
        })

    return result
