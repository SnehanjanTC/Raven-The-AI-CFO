"""
Shared test fixtures and utilities for Raven test suite.
Provides sample data and mocks for unit tests.
"""

import pytest
import os
from datetime import datetime, date, timedelta
from typing import List, Dict

# Remove VITE_ env vars before importing app config
for key in list(os.environ.keys()):
    if key.startswith("VITE_"):
        del os.environ[key]

# Set test environment variables
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///test.db"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-key"
os.environ["ANTHROPIC_API_KEY"] = "test-key"


# Sample transaction data for testing
SAMPLE_TRANSACTIONS = [
    {
        "id": "txn_1",
        "date": "2026-04-20",
        "description": "Stripe Payment",
        "amount": 5000.0,
        "type": "credit",
        "category": "Stripe Revenue",
        "vendor": "Stripe",
        "status": "cleared",
    },
    {
        "id": "txn_2",
        "date": "2026-04-18",
        "description": "Customer Invoice",
        "amount": 3000.0,
        "type": "credit",
        "category": "Customer Revenue",
        "vendor": "Direct",
        "status": "cleared",
    },
    {
        "id": "txn_3",
        "date": "2026-04-15",
        "description": "AWS Bill",
        "amount": 1200.0,
        "type": "debit",
        "category": "Cloud Infrastructure",
        "vendor": "AWS",
        "status": "cleared",
    },
    {
        "id": "txn_4",
        "date": "2026-04-12",
        "description": "Slack Subscription",
        "amount": 800.0,
        "type": "debit",
        "category": "SaaS",
        "vendor": "Slack",
        "status": "cleared",
    },
    {
        "id": "txn_5",
        "date": "2026-04-10",
        "description": "Salary Payment",
        "amount": 5000.0,
        "type": "debit",
        "category": "Salary",
        "vendor": "Payroll",
        "status": "cleared",
    },
    {
        "id": "txn_6",
        "date": "2026-03-25",
        "description": "Customer Payment",
        "amount": 4000.0,
        "type": "credit",
        "category": "Revenue",
        "vendor": "Direct",
        "status": "cleared",
    },
    {
        "id": "txn_7",
        "date": "2026-03-20",
        "description": "AWS Bill",
        "amount": 1100.0,
        "type": "debit",
        "category": "Cloud Infrastructure",
        "vendor": "AWS",
        "status": "cleared",
    },
    {
        "id": "txn_8",
        "date": "2026-03-15",
        "description": "Marketing Spend",
        "amount": 2000.0,
        "type": "debit",
        "category": "Marketing",
        "vendor": "Google Ads",
        "status": "cleared",
    },
]

# Sample metrics for testing
SAMPLE_METRICS = {
    "mrr": 8000.0,
    "arr": 96000.0,
    "monthly_expenses": 7000.0,
    "gross_burn": 7000.0,
    "net_burn": -1000.0,
    "cash_balance": 50000.0,
    "runway_months": float("inf"),
    "mom_revenue_growth_pct": 100.0,
    "mom_expense_change_pct": 250.0,
    "gross_margin_pct": 85.0,
    "net_margin_pct": 12.5,
    "total_revenue": 100000.0,
    "total_expenses": 87500.0,
    "total_cogs": 15000.0,
    "last_updated": datetime.utcnow().isoformat(),
}

# Sample CSV content for testing
SAMPLE_CSV_CONTENT = """Date,Description,Amount,Category
2026-04-20,Customer Payment,5000.00,Revenue
2026-04-18,AWS Bill,1200.00,Cloud Infrastructure
2026-04-15,Slack Subscription,800.00,SaaS
2026-04-10,Salary Payment,5000.00,Salary
2026-03-25,Customer Payment,4000.00,Revenue
2026-03-20,AWS Bill,1100.00,Cloud Infrastructure"""

SAMPLE_CSV_EUROPEAN = """Date,Description,Amount,Category
23/04/2026,Customer Payment,€5.000,00,Revenue
18/04/2026,AWS Bill,€1.200,00,Cloud Infrastructure
15/04/2026,Slack Subscription,€800,00,SaaS"""


@pytest.fixture
def sample_transactions() -> List[Dict]:
    """Fixture providing sample transaction data."""
    return SAMPLE_TRANSACTIONS.copy()


@pytest.fixture
def sample_metrics() -> Dict:
    """Fixture providing sample metrics."""
    return SAMPLE_METRICS.copy()


@pytest.fixture
def sample_csv() -> str:
    """Fixture providing sample CSV content."""
    return SAMPLE_CSV_CONTENT


@pytest.fixture
def sample_csv_european() -> str:
    """Fixture providing sample European format CSV."""
    return SAMPLE_CSV_EUROPEAN


@pytest.fixture
def current_month() -> str:
    """Fixture providing current month in YYYY-MM format."""
    return date.today().strftime("%Y-%m")


@pytest.fixture
def last_month() -> str:
    """Fixture providing last month in YYYY-MM format."""
    today = date.today()
    last = today.replace(day=1) - timedelta(days=1)
    return last.strftime("%Y-%m")


@pytest.fixture
def april_2026_transactions() -> List[Dict]:
    """Fixture with only April 2026 transactions (current month)."""
    return [t for t in SAMPLE_TRANSACTIONS if t["date"].startswith("2026-04")]


@pytest.fixture
def march_2026_transactions() -> List[Dict]:
    """Fixture with only March 2026 transactions (last month)."""
    return [t for t in SAMPLE_TRANSACTIONS if t["date"].startswith("2026-03")]
