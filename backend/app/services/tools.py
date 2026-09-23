"""
Tool handlers for Claude AI CFO to query financial data.
Each tool executes against the database and returns structured data.
"""

import httpx
import json
from typing import Optional, List
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from collections import defaultdict

from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.services.metrics import compute_all_metrics, get_expense_breakdown
from app.services.proposals import (
    create_proposal, NotConfiguredError, ProposalError,
)


# Categories that count as Cost of Goods Sold
COGS_CATEGORIES = {
    "cogs", "cost of goods sold", "cost of revenue", "cost of services",
    "infrastructure", "cloud infrastructure", "hosting", "data costs",
    "fulfilment", "fulfillment", "shipping", "merchant fees",
}

# Categories that DON'T count as recurring revenue
NON_REVENUE_CREDIT_CATEGORIES = {
    "refund", "loan proceeds", "loan", "grant", "investment", "capital",
    "owner contribution", "interest income", "tax refund",
}


async def get_metrics(
    db: AsyncSession,
    user_id: str,
    supabase_url: Optional[str] = None,
    supabase_key: Optional[str] = None,
) -> dict:
    """
    Get current financial metrics for the user.
    Uses Supabase if credentials provided, otherwise falls back to SQLAlchemy.

    Returns:
        Dict with keys: mrr, arr, burn_rate, cash_balance, runway_months,
        gross_margin_pct, net_margin_pct, total_revenue, total_expenses
    """

    # If Supabase credentials provided, use the new metrics engine
    if supabase_url and supabase_key:
        return await compute_all_metrics(supabase_url, supabase_key, user_id)

    # Fall back to SQLAlchemy for backwards compatibility
    # Fetch transactions
    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user_id)
    )
    transactions = txn_result.scalars().all()

    def _cat(t) -> str:
        return (getattr(t, "category", "") or "").strip().lower()

    # Calculate revenue and expenses
    revenue = sum(
        t.amount for t in transactions
        if t.type == "credit" and _cat(t) not in NON_REVENUE_CREDIT_CATEGORIES
    )
    expenses = sum(t.amount for t in transactions if t.type == "debit")
    cogs = sum(
        t.amount for t in transactions
        if t.type == "debit" and _cat(t) in COGS_CATEGORIES
    )

    cash_balance = revenue - expenses

    # Group by month for MRR and burn calculations
    monthly_revenue = defaultdict(float)
    monthly_expenses = defaultdict(float)

    for t in transactions:
        month_key = t.date.strftime("%Y-%m") if hasattr(t.date, "strftime") else str(t.date)[:7]
        if t.type == "credit" and _cat(t) not in NON_REVENUE_CREDIT_CATEGORIES:
            monthly_revenue[month_key] += t.amount
        elif t.type == "debit":
            monthly_expenses[month_key] += t.amount

    # Get latest month's MRR and burn
    latest_month = sorted(monthly_revenue.keys())[-1] if monthly_revenue else None
    mrr = monthly_revenue.get(latest_month, 0) if latest_month else 0

    previous_month = None
    if latest_month and len(sorted(monthly_revenue.keys())) > 1:
        previous_month = sorted(monthly_revenue.keys())[-2]
    burn_rate = monthly_expenses.get(latest_month, 0) if latest_month else 0

    # Calculate margins
    gross_margin_pct = ((revenue - cogs) / revenue * 100) if revenue > 0 else 0
    net_margin_pct = ((revenue - expenses) / revenue * 100) if revenue > 0 else 0

    # Calculate runway
    runway_months = None
    if burn_rate > 0 and cash_balance > 0:
        runway_months = round(cash_balance / burn_rate, 1)
    elif burn_rate == 0 and cash_balance > 0:
        runway_months = float("inf")

    arr = mrr * 12 if mrr > 0 else 0

    return {
        "mrr": round(mrr, 2),
        "arr": round(arr, 2),
        "burn_rate": round(burn_rate, 2),
        "cash_balance": round(cash_balance, 2),
        "runway_months": runway_months,
        "gross_margin_pct": round(gross_margin_pct, 1),
        "net_margin_pct": round(net_margin_pct, 1),
        "total_revenue": round(revenue, 2),
        "total_expenses": round(expenses, 2),
        "last_updated": datetime.utcnow().isoformat(),
    }


async def run_scenario(
    current_metrics: dict,
    description: str,
    adjustments: dict
) -> dict:
    """
    Run a what-if scenario on financial metrics.

    Args:
        current_metrics: Current metrics from get_metrics
        description: Description of the scenario (e.g., "hire 2 engineers")
        adjustments: Dict with keys like:
            - revenue_increase: percentage increase (e.g., 0.1 for +10%)
            - revenue_amount: absolute revenue increase
            - expense_increase: percentage increase
            - expense_amount: absolute expense increase
            - months: number of months to project

    Returns:
        Dict with scenario results and comparisons
    """
    current_mrr = current_metrics.get("mrr", 0)
    current_burn = current_metrics.get("burn_rate", 0)
    current_cash = current_metrics.get("cash_balance", 0)
    months = adjustments.get("months", 12)

    # Apply adjustments
    scenario_mrr = current_mrr
    scenario_burn = current_burn

    if "revenue_increase" in adjustments:
        scenario_mrr = current_mrr * (1 + adjustments["revenue_increase"])
    if "revenue_amount" in adjustments:
        scenario_mrr = current_mrr + adjustments["revenue_amount"]

    if "expense_increase" in adjustments:
        scenario_burn = current_burn * (1 + adjustments["expense_increase"])
    if "expense_amount" in adjustments:
        scenario_burn = current_burn + adjustments["expense_amount"]

    # Project forward
    net_monthly = scenario_mrr - scenario_burn
    projected_cash = current_cash + (net_monthly * months)
    projected_runway = None
    if scenario_burn > 0:
        projected_runway = round(projected_cash / scenario_burn, 1)

    return {
        "scenario_description": description,
        "months_projected": months,
        "projected_mrr": round(scenario_mrr, 2),
        "projected_burn": round(scenario_burn, 2),
        "projected_net_monthly": round(net_monthly, 2),
        "projected_cash_balance": round(projected_cash, 2),
        "projected_runway_months": projected_runway,
        "comparison": {
            "mrr_delta": round(scenario_mrr - current_mrr, 2),
            "burn_delta": round(scenario_burn - current_burn, 2),
            "cash_impact": round(projected_cash - current_cash, 2),
        },
    }


async def get_transactions(
    db: AsyncSession,
    user_id: str,
    limit: int = 20,
    category: Optional[str] = None
) -> List[dict]:
    """
    Get recent transactions, optionally filtered by category.

    Args:
        db: Database session
        user_id: User ID to filter by
        limit: Max number of transactions to return
        category: Optional category to filter by

    Returns:
        List of transaction dicts
    """
    query = select(Transaction).where(Transaction.user_id == user_id)

    if category:
        query = query.where(Transaction.category.ilike(f"%{category}%"))

    query = query.order_by(Transaction.date.desc()).limit(limit)

    result = await db.execute(query)
    transactions = result.scalars().all()

    return [
        {
            "id": t.id,
            "date": t.date.isoformat() if hasattr(t.date, "isoformat") else str(t.date),
            "description": t.description,
            "amount": t.amount,
            "type": t.type,
            "category": t.category,
            "vendor": t.vendor,
            "status": t.status,
        }
        for t in transactions
    ]


async def generate_report(
    db: AsyncSession,
    user_id: str,
    report_type: str = "summary"
) -> dict:
    """
    Generate a financial report.

    Args:
        db: Database session
        user_id: User ID to generate report for
        report_type: Type of report (summary, p&l, board_update, cash_flow)

    Returns:
        Dict with report sections and data
    """
    # Get metrics
    metrics = await get_metrics(db, user_id)

    # Get recent transactions
    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user_id)
    )
    transactions = txn_result.scalars().all()

    # Categorize expenses
    expense_by_category = defaultdict(float)
    for t in transactions:
        if t.type == "debit":
            cat = (t.category or "Other").strip()
            expense_by_category[cat] += t.amount

    # Categorize revenue
    revenue_by_category = defaultdict(float)
    for t in transactions:
        if t.type == "credit" and t.category.lower() not in [c.lower() for c in NON_REVENUE_CREDIT_CATEGORIES]:
            cat = (t.category or "Revenue").strip()
            revenue_by_category[cat] += t.amount

    if report_type == "p&l":
        return {
            "report_type": "p&l",
            "title": "Profit & Loss Statement",
            "sections": {
                "revenue": {
                    "total": metrics["total_revenue"],
                    "by_category": dict(revenue_by_category),
                },
                "expenses": {
                    "total": metrics["total_expenses"],
                    "by_category": dict(expense_by_category),
                },
                "net": metrics["total_revenue"] - metrics["total_expenses"],
                "gross_margin_pct": metrics["gross_margin_pct"],
                "net_margin_pct": metrics["net_margin_pct"],
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

    elif report_type == "board_update":
        return {
            "report_type": "board_update",
            "title": "Board Update / Monthly Snapshot",
            "highlights": {
                "mrr": metrics["mrr"],
                "arr": metrics["arr"],
                "cash_balance": metrics["cash_balance"],
                "runway_months": metrics["runway_months"],
                "burn_rate": metrics["burn_rate"],
            },
            "performance": {
                "gross_margin_pct": metrics["gross_margin_pct"],
                "net_margin_pct": metrics["net_margin_pct"],
            },
            "top_expenses": sorted(
                [(k, v) for k, v in expense_by_category.items()],
                key=lambda x: x[1],
                reverse=True
            )[:5],
            "generated_at": datetime.utcnow().isoformat(),
        }

    else:  # summary
        return {
            "report_type": "summary",
            "title": "Financial Summary",
            "metrics": metrics,
            "top_expenses": sorted(
                [(k, v) for k, v in expense_by_category.items()],
                key=lambda x: x[1],
                reverse=True
            )[:5],
            "revenue_breakdown": dict(revenue_by_category),
            "generated_at": datetime.utcnow().isoformat(),
        }


async def update_metrics(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    metrics_data: dict,
    conversation_id: Optional[str] = None,
    reason: Optional[str] = None,
) -> dict:
    """
    Agent-facing tool: PROPOSE a metric update for human review.

    Never writes to the metrics table directly. Lands a row in agent_proposals
    with status='pending'; the founder approves or rejects it from the UI.
    The actual write happens inside app.services.proposals — the only place
    metric rows can be modified from the agent flow.

    Args:
        supabase_url: Supabase project URL (kept in the signature for
            backwards compatibility with existing callers)
        supabase_key: Supabase service key (same, unused here)
        user_id: User ID
        metrics_data: Dict with one metric snapshot to upsert:
            - label: Metric label (e.g. "MRR", "Cash Balance")  [required]
            - value: Display value (string)                     [required]
            - change: Optional delta string ("+12%")
            - trend: Optional "up" | "down" | "stable"
            - subtext: Optional context ("vs. last month")
            - category: Optional ("financial", ...)
        conversation_id: Conversation the proposal belongs to (for audit)
        reason: Agent's rationale for the change (recorded on the proposal)

    Returns:
        A payload the agent can quote back to the founder, including
        the proposal_id so the UI can deep-link to the review card.
    """
    try:
        proposal = await create_proposal(
            user_id=user_id,
            kind="update_metric",
            payload=metrics_data,
            reason=reason,
            conversation_id=conversation_id,
        )
    except NotConfiguredError as exc:
        return {"status": "not_configured", "message": str(exc)}
    except ProposalError as exc:
        return {"status": "error", "message": str(exc)}

    return {
        "status": "pending_review",
        "proposal_id": proposal.get("id"),
        "message": (
            "Drafted a metric update. It will only be applied once you approve "
            "it in the review drawer."
        ),
        "kind": "update_metric",
        "payload": metrics_data,
        "timestamp": datetime.utcnow().isoformat(),
    }


async def add_transaction(
    supabase_url: str,
    supabase_key: str,
    user_id: str,
    transaction_data: dict,
    conversation_id: Optional[str] = None,
    reason: Optional[str] = None,
) -> dict:
    """
    Agent-facing tool: PROPOSE a new transaction for human review.

    Never inserts into `transactions` directly. Lands a row in agent_proposals
    with status='pending'. Approval routes through app.services.proposals,
    which is the only file allowed to commit to `transactions`.

    Args:
        supabase_url / supabase_key: kept for signature compatibility
        user_id: User ID
        transaction_data: Dict with fields:
            - date: YYYY-MM-DD
            - description: str
            - amount: number (positive)
            - type: "income" | "expense"
            - category: str
        conversation_id: For audit linkage
        reason: Agent's rationale for the transaction

    Returns:
        Proposal envelope with proposal_id, kind, and the payload the
        founder will see in the review drawer.
    """
    payload = {
        "date": transaction_data.get("date"),
        "description": transaction_data.get("description"),
        "amount": float(transaction_data.get("amount", 0) or 0),
        "type": transaction_data.get("type", "expense"),
        "category": transaction_data.get("category", "Other"),
    }
    try:
        proposal = await create_proposal(
            user_id=user_id,
            kind="add_transaction",
            payload=payload,
            reason=reason,
            conversation_id=conversation_id,
        )
    except NotConfiguredError as exc:
        return {"status": "not_configured", "message": str(exc)}
    except ProposalError as exc:
        return {"status": "error", "message": str(exc)}

    return {
        "status": "pending_review",
        "proposal_id": proposal.get("id"),
        "message": (
            f"Drafted a {payload['type']} for {payload['description']!r}. "
            "It will only be recorded once you approve it."
        ),
        "kind": "add_transaction",
        "payload": payload,
        "timestamp": datetime.utcnow().isoformat(),
    }
