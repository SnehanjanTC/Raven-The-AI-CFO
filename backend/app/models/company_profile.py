import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, index=True)

    # Company Basics
    company_name: Mapped[str | None] = mapped_column(String, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String, nullable=True)  # pvt_ltd, llp, opc, partnership, sole_proprietor
    incorporation_date: Mapped[str | None] = mapped_column(String, nullable=True)
    industry_vertical: Mapped[str | None] = mapped_column(String, nullable=True)  # fintech, healthtech, edtech, ecommerce, saas, marketplace, deeptech, agritech, other
    industry_sub_sector: Mapped[str | None] = mapped_column(String, nullable=True)

    # Business Model
    business_model: Mapped[str | None] = mapped_column(String, nullable=True)  # saas, marketplace, d2c, services, hardware, hybrid
    revenue_model: Mapped[str | None] = mapped_column(String, nullable=True)  # subscription, transactional, one_time, usage_based, hybrid
    avg_deal_size: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_contract_length_months: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Funding
    funding_stage: Mapped[str | None] = mapped_column(String, nullable=True)  # bootstrapped, pre_seed, seed, series_a, series_b, series_c_plus
    last_raise_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_capital_raised: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_raise_date: Mapped[str | None] = mapped_column(String, nullable=True)

    # Cash & Burn
    cash_reserves: Mapped[float | None] = mapped_column(Float, nullable=True)
    monthly_burn_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    monthly_revenue: Mapped[float | None] = mapped_column(Float, nullable=True)
    runway_target_months: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Unit Economics
    cac: Mapped[float | None] = mapped_column(Float, nullable=True)
    ltv: Mapped[float | None] = mapped_column(Float, nullable=True)
    payback_period_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gross_margin_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    net_margin_target: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Customers
    customer_type: Mapped[str | None] = mapped_column(String, nullable=True)  # b2b, b2c, b2b2c
    customer_segment: Mapped[str | None] = mapped_column(String, nullable=True)  # enterprise, mid_market, smb, consumer
    avg_contract_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    monthly_churn_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Team
    team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    engineering_headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sales_headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ops_headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contractor_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Financial Goals
    next_fundraise_date: Mapped[str | None] = mapped_column(String, nullable=True)
    profitability_target_date: Mapped[str | None] = mapped_column(String, nullable=True)
    revenue_target_3m: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_target_6m: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue_target_12m: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_strategy: Mapped[str | None] = mapped_column(String, nullable=True)  # ipo, acquisition, lifestyle, undecided

    # Compliance
    operating_states: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of state codes
    has_gst_registration: Mapped[bool] = mapped_column(Boolean, default=False)
    has_tan_registration: Mapped[bool] = mapped_column(Boolean, default=False)
    gstin: Mapped[str | None] = mapped_column(String, nullable=True)
    pan: Mapped[str | None] = mapped_column(String, nullable=True)
    auditor_appointed: Mapped[bool] = mapped_column(Boolean, default=False)
    statutory_audit_required: Mapped[bool] = mapped_column(Boolean, default=False)
    current_fy: Mapped[str | None] = mapped_column(String, nullable=True)

    # Meta
    profile_completeness: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
