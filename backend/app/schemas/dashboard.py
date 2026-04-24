from pydantic import BaseModel
from typing import Optional

class DashboardMetric(BaseModel):
    id: str
    label: str
    value: str
    change: str
    trend: str  # up, down, stable

class DashboardResponse(BaseModel):
    metrics: list[DashboardMetric]
    cash_balance: float
    monthly_burn: float
    # `runway_months` is None when monthly_burn is 0 (i.e. no expenses recorded
    # yet) — that means runway is unbounded, NOT 0 or 999. Frontends should
    # render "—" or "N/A" for null.
    runway_months: Optional[float] = None
    mrr: float
    arr_projection: float
    # `gross_margin` is now computed only from COGS / Cost-of-Revenue categories.
    # `net_margin` is the legacy metric (revenue - all expenses).
    gross_margin: float
    net_margin: float = 0.0
    tds_liability: float
    gst_liability: float
    ptax_liability: float
    overdue_filings: int
    upcoming_deadlines: int
    # New: row counts so the UI can personalise messages without guessing
    # field names. None of these previously existed, so older clients ignore
    # them safely.
    invoice_count: int = 0
    transaction_count: int = 0
    filing_count: int = 0

class CashFlowPoint(BaseModel):
    period: str
    inflow: float
    outflow: float

class MrrTrendPoint(BaseModel):
    month: str
    mrr: float

class ExpenseBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float
