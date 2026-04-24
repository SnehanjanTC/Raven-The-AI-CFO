from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.filing import Filing
from app.schemas.dashboard import (
    DashboardResponse,
    DashboardMetric,
    MrrTrendPoint,
    CashFlowPoint,
    ExpenseBreakdown,
)

router = APIRouter()


# Categories that count as Cost of Goods Sold (used for the *gross* margin
# calc only). Anything outside this set is treated as an operating expense.
COGS_CATEGORIES = {
    "cogs", "cost of goods sold", "cost of revenue", "cost of services",
    "infrastructure", "cloud infrastructure", "hosting", "data costs",
    "fulfilment", "fulfillment", "shipping", "merchant fees",
}

# Categories that DON'T count as recurring revenue (we still call them
# "credit" in the local schema, but they're not real top-line).
NON_REVENUE_CREDIT_CATEGORIES = {
    "refund", "loan proceeds", "loan", "grant", "investment", "capital",
    "owner contribution", "interest income", "tax refund",
}


@router.get("/summary", response_model=DashboardResponse)
async def get_dashboard_summary(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Comprehensive dashboard metrics derived from local transaction data.

    Note: when the Zoho Books MCP is connected the frontend prefers
    /api/v1/zohomcp/revenue instead of this endpoint. This route is the
    "no live integration" baseline used by Copilot personalisation and the
    pre-Zoho dashboards.
    """
    if not user:
        # Return empty dashboard for unauthenticated
        return DashboardResponse(
            metrics=[],
            cash_balance=0,
            monthly_burn=0,
            runway_months=None,
            mrr=0,
            arr_projection=0,
            gross_margin=0,
            net_margin=0,
            tds_liability=0,
            gst_liability=0,
            ptax_liability=0,
            overdue_filings=0,
            upcoming_deadlines=0,
            invoice_count=0,
            transaction_count=0,
            filing_count=0,
        )

    # Fetch transactions
    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    transactions = txn_result.scalars().all()

    # Fetch invoices
    inv_result = await db.execute(
        select(Invoice).where(Invoice.user_id == user.id)
    )
    invoices = inv_result.scalars().all()

    # Fetch filings
    fil_result = await db.execute(
        select(Filing).where(Filing.user_id == user.id)
    )
    filings = fil_result.scalars().all()

    def _cat(t) -> str:
        return (getattr(t, "category", "") or "").strip().lower()

    # ── Revenue (only true top-line credits) ─────────────────────────
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
    # Gross margin = (Revenue − COGS) / Revenue. Operating expenses are
    # excluded; only direct cost of delivery counts.
    gross_margin = ((revenue - cogs) / revenue * 100) if revenue > 0 else 0
    # Net margin = (Revenue − all expenses) / Revenue.
    net_margin = ((revenue - expenses) / revenue * 100) if revenue > 0 else 0

    # ── Monthly burn (last 30 days of debits) ────────────────────────
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_txns = [t for t in transactions if t.created_at >= thirty_days_ago]
    monthly_burn = sum(t.amount for t in recent_txns if t.type == "debit")

    # ── Runway ───────────────────────────────────────────────────────
    # If there is NO burn yet, runway is undefined (unbounded). We return
    # None so the UI can show "—" instead of a misleading 999.
    if monthly_burn > 0:
        runway_months: float | None = round(cash_balance / monthly_burn, 1)
    else:
        runway_months = None

    # ── MRR via trailing-12-month billings ÷ 12 ──────────────────────
    # Mirrors the Zoho aggregator (TTM/12). This is the only definition
    # that survives mixed billing cadences without classifying every
    # customer. One-time spikes get smoothed out across the year.
    today = datetime.utcnow().date()
    twelve_months_ago = today - timedelta(days=365)
    ttm_revenue = sum(
        t.amount for t in transactions
        if t.type == "credit"
        and _cat(t) not in NON_REVENUE_CREDIT_CATEGORIES
        and getattr(t, "date", None) is not None
        and t.date >= twelve_months_ago
    )
    mrr = ttm_revenue / 12.0
    arr_projection = ttm_revenue  # ARR (TTM) — what was actually billed.

    # ── Tax liabilities ──────────────────────────────────────────────
    # TDS: sum of explicitly recorded tds_amount on transactions.
    tds_liability = sum(
        (t.tds_amount or 0) for t in transactions if (t.tds_amount or 0) > 0
    )
    # GST: sum from BOTH transactions and invoices (whichever recorded it).
    # Prior version only checked invoices, missing GST captured at txn level.
    gst_from_txns = sum(
        (t.gst_amount or 0) for t in transactions if (t.gst_amount or 0) > 0
    )
    gst_from_invoices = sum(
        (getattr(i, "gst_amount", 0) or 0) for i in invoices
    )
    gst_liability = gst_from_txns + gst_from_invoices
    # P-Tax: cap at the Maharashtra slab (₹200/employee/month). Without an
    # employee count we approximate as 0.25% of payroll outflows. This is
    # a placeholder until a payroll-roster integration lands; the previous
    # implementation summed the *entire* payroll which was wildly wrong.
    payroll_total = sum(
        t.amount for t in transactions if _cat(t) == "payroll"
    )
    ptax_liability = round(payroll_total * 0.0025, 2)

    # Filing metrics
    overdue_filings = sum(1 for f in filings if f.status == "overdue")
    upcoming_deadlines = sum(
        1 for f in filings
        if f.status == "pending" and f.due_date <= datetime.utcnow().date() + timedelta(days=30)
    )

    # Build display metrics array
    metrics = [
        DashboardMetric(
            id="revenue",
            label="Total Revenue",
            value=f"₹{revenue:,.0f}",
            change="+12%" if revenue > 0 else "0%",
            trend="up" if revenue > 0 else "stable",
        ),
        DashboardMetric(
            id="expenses",
            label="Total Expenses",
            value=f"₹{expenses:,.0f}",
            change="+5%",
            trend="up",
        ),
        DashboardMetric(
            id="mrr",
            label="MRR (TTM ÷ 12)",
            value=f"₹{mrr:,.0f}",
            change="+8%",
            trend="up",
        ),
        DashboardMetric(
            id="cash",
            label="Cash Balance",
            value=f"₹{cash_balance:,.0f}",
            change="+7%",
            trend="up" if cash_balance > 0 else "down",
        ),
    ]

    return DashboardResponse(
        metrics=metrics,
        cash_balance=cash_balance,
        monthly_burn=monthly_burn,
        runway_months=runway_months,
        mrr=round(mrr, 2),
        arr_projection=round(arr_projection, 2),
        gross_margin=round(gross_margin, 2),
        net_margin=round(net_margin, 2),
        tds_liability=tds_liability,
        gst_liability=gst_liability,
        ptax_liability=ptax_liability,
        overdue_filings=overdue_filings,
        upcoming_deadlines=upcoming_deadlines,
        invoice_count=len(invoices),
        transaction_count=len(transactions),
        filing_count=len(filings),
    )


@router.get("/mrr-trend")
async def get_mrr_trend(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get MRR trend data."""
    if not user:
        return []

    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    transactions = txn_result.scalars().all()

    # Group by month
    monthly_data = defaultdict(float)
    for t in transactions:
        if t.type == "credit":
            month_key = t.created_at.strftime("%Y-%m")
            monthly_data[month_key] += t.amount

    result = [
        MrrTrendPoint(month=month, mrr=amount)
        for month, amount in sorted(monthly_data.items())
    ]
    return result


@router.get("/cash-flow")
async def get_cash_flow(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get cash flow data."""
    if not user:
        return []

    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    transactions = txn_result.scalars().all()

    # Group by period
    period_data = defaultdict(lambda: {"inflow": 0, "outflow": 0})
    for t in transactions:
        period_key = t.created_at.strftime("%Y-%m")
        if t.type == "credit":
            period_data[period_key]["inflow"] += t.amount
        else:
            period_data[period_key]["outflow"] += t.amount

    result = [
        CashFlowPoint(
            period=period,
            inflow=data["inflow"],
            outflow=data["outflow"],
        )
        for period, data in sorted(period_data.items())
    ]
    return result


@router.get("/expenses")
async def get_expense_breakdown(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get expense breakdown by category."""
    if not user:
        return []

    txn_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.user_id == user.id,
                Transaction.type == "debit",
            )
        )
    )
    transactions = txn_result.scalars().all()

    category_totals = defaultdict(float)
    for t in transactions:
        category_totals[t.category] += t.amount

    total_expenses = sum(category_totals.values())

    result = [
        ExpenseBreakdown(
            category=category,
            amount=amount,
            percentage=round((amount / total_expenses * 100), 2) if total_expenses > 0 else 0,
        )
        for category, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]
    return result


@router.get("/anomalies")
async def get_anomalies(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detect and return anomalies in financial data."""
    if not user:
        return []

    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    transactions = txn_result.scalars().all()

    if len(transactions) < 10:
        return []

    # Calculate average debit amount
    debit_txns = [t for t in transactions if t.type == "debit"]
    if not debit_txns:
        return []

    avg_debit = sum(t.amount for t in debit_txns) / len(debit_txns)
    std_dev = (sum((t.amount - avg_debit) ** 2 for t in debit_txns) / len(debit_txns)) ** 0.5

    # Find anomalies (>2 std devs from mean)
    anomalies = []
    for t in debit_txns:
        if abs(t.amount - avg_debit) > 2 * std_dev:
            anomalies.append({
                "transaction_id": t.id,
                "description": t.description,
                "amount": t.amount,
                "expected_range": f"₹{avg_debit - 2*std_dev:,.0f} - ₹{avg_debit + 2*std_dev:,.0f}",
                "severity": "high" if abs(t.amount - avg_debit) > 3 * std_dev else "medium",
            })

    return anomalies
