"""Unit tests for Pydantic schemas."""
import pytest
from datetime import date, datetime
from pydantic import ValidationError

from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionFilter,
    TransactionResponse,
)
from app.schemas.dashboard import DashboardMetric, DashboardResponse, ExpenseBreakdown
from app.schemas.report import ReportCreate, ReportResponse


class TestAuthSchemas:
    def test_user_create_valid(self):
        user = UserCreate(email="test@example.com", password="secret123")
        assert user.email == "test@example.com"
        assert user.full_name is None

    def test_user_create_with_optional_fields(self):
        user = UserCreate(
            email="test@example.com",
            password="secret123",
            full_name="John Doe",
            company_name="Acme Inc",
        )
        assert user.full_name == "John Doe"
        assert user.company_name == "Acme Inc"

    def test_user_create_missing_email(self):
        with pytest.raises(ValidationError):
            UserCreate(password="secret123")

    def test_user_create_missing_password(self):
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com")

    def test_user_login(self):
        login = UserLogin(email="user@test.com", password="pass")
        assert login.email == "user@test.com"

    def test_token_defaults(self):
        token = Token(access_token="abc123")
        assert token.token_type == "bearer"

    def test_user_response(self):
        user = UserResponse(
            id="uuid-1",
            email="test@test.com",
            full_name="Test",
            company_name=None,
            gstin=None,
            pan=None,
            startup_stage=None,
            is_guest=False,
        )
        assert user.id == "uuid-1"
        assert not user.is_guest


class TestTransactionSchemas:
    def test_transaction_create_minimal(self):
        txn = TransactionCreate(
            date=date(2026, 4, 11),
            description="AWS bill",
            amount=1200.50,
            type="debit",
            category="Cloud",
        )
        assert txn.amount == 1200.50
        assert txn.status == "pending"
        assert txn.vendor is None

    def test_transaction_create_full(self):
        txn = TransactionCreate(
            date=date(2026, 4, 11),
            description="Consulting Payment",
            amount=50000,
            type="debit",
            category="Services",
            subcategory="Consulting",
            vendor="CloudArch",
            tds_section="194J",
            tds_rate=10.0,
            tds_amount=5000.0,
            gst_rate=18.0,
            gst_amount=9000.0,
            status="cleared",
        )
        assert txn.tds_section == "194J"
        assert txn.gst_rate == 18.0

    def test_transaction_update_partial(self):
        update = TransactionUpdate(status="cleared")
        assert update.status == "cleared"
        assert update.description is None

    def test_transaction_filter_empty(self):
        f = TransactionFilter()
        assert f.type is None
        assert f.date_from is None

    def test_transaction_filter_with_dates(self):
        f = TransactionFilter(
            date_from=date(2026, 1, 1),
            date_to=date(2026, 12, 31),
            type="debit",
        )
        assert f.date_from == date(2026, 1, 1)

    def test_transaction_create_invalid_missing_fields(self):
        with pytest.raises(ValidationError):
            TransactionCreate(description="test", amount=100)


class TestDashboardSchemas:
    def test_dashboard_metric(self):
        m = DashboardMetric(
            id="1", label="Cash", value="$100k", change="+5%", trend="up"
        )
        assert m.trend == "up"

    def test_dashboard_response_defaults(self):
        resp = DashboardResponse(
            metrics=[],
            cash_balance=100000,
            monthly_burn=20000,
            runway_months=5.0,
            mrr=50000,
            arr_projection=600000,
            gross_margin=78.0,
            tds_liability=10000,
            gst_liability=5000,
            ptax_liability=200,
            overdue_filings=0,
            upcoming_deadlines=2,
        )
        assert resp.invoice_count == 0
        assert resp.net_margin == 0.0

    def test_dashboard_response_null_runway(self):
        resp = DashboardResponse(
            metrics=[],
            cash_balance=100000,
            monthly_burn=0,
            runway_months=None,
            mrr=50000,
            arr_projection=600000,
            gross_margin=78.0,
            tds_liability=0,
            gst_liability=0,
            ptax_liability=0,
            overdue_filings=0,
            upcoming_deadlines=0,
        )
        assert resp.runway_months is None

    def test_expense_breakdown(self):
        e = ExpenseBreakdown(category="Cloud", amount=5000, percentage=25.0)
        assert e.percentage == 25.0


class TestReportSchemas:
    def test_report_create_defaults(self):
        r = ReportCreate(name="Q1 Report", type="Financial", period="Q1 2026")
        assert r.version == "v1.0"

    def test_report_create_custom_version(self):
        r = ReportCreate(
            name="Annual", type="Audit", period="FY2025", version="v2.3"
        )
        assert r.version == "v2.3"

    def test_report_response(self):
        r = ReportResponse(
            id="uuid",
            name="Test",
            type="Financial",
            period="Q1",
            version="v1.0",
            status="draft",
            icon="FileText",
            data_json=None,
            created_at=datetime(2026, 4, 11),
        )
        assert r.status == "draft"
        assert r.data_json is None
