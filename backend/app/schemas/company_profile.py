from pydantic import BaseModel


class CompanyProfileCreate(BaseModel):
    user_id: str
    company_name: str | None = None
    entity_type: str | None = None
    incorporation_date: str | None = None
    industry_vertical: str | None = None
    industry_sub_sector: str | None = None
    business_model: str | None = None
    revenue_model: str | None = None
    avg_deal_size: float | None = None
    avg_contract_length_months: int | None = None
    funding_stage: str | None = None
    last_raise_amount: float | None = None
    total_capital_raised: float | None = None
    last_raise_date: str | None = None
    cash_reserves: float | None = None
    monthly_burn_rate: float | None = None
    monthly_revenue: float | None = None
    runway_target_months: int | None = None
    cac: float | None = None
    ltv: float | None = None
    payback_period_months: int | None = None
    gross_margin_target: float | None = None
    net_margin_target: float | None = None
    customer_type: str | None = None
    customer_segment: str | None = None
    avg_contract_value: float | None = None
    monthly_churn_rate: float | None = None
    team_size: int | None = None
    engineering_headcount: int | None = None
    sales_headcount: int | None = None
    ops_headcount: int | None = None
    contractor_count: int | None = None
    next_fundraise_date: str | None = None
    profitability_target_date: str | None = None
    revenue_target_3m: float | None = None
    revenue_target_6m: float | None = None
    revenue_target_12m: float | None = None
    exit_strategy: str | None = None
    operating_states: str | None = None
    has_gst_registration: bool = False
    has_tan_registration: bool = False
    gstin: str | None = None
    pan: str | None = None
    auditor_appointed: bool = False
    statutory_audit_required: bool = False
    current_fy: str | None = None
    profile_completeness: int = 0
    last_reviewed_at: str | None = None


class CompanyProfileUpdate(BaseModel):
    company_name: str | None = None
    entity_type: str | None = None
    incorporation_date: str | None = None
    industry_vertical: str | None = None
    industry_sub_sector: str | None = None
    business_model: str | None = None
    revenue_model: str | None = None
    avg_deal_size: float | None = None
    avg_contract_length_months: int | None = None
    funding_stage: str | None = None
    last_raise_amount: float | None = None
    total_capital_raised: float | None = None
    last_raise_date: str | None = None
    cash_reserves: float | None = None
    monthly_burn_rate: float | None = None
    monthly_revenue: float | None = None
    runway_target_months: int | None = None
    cac: float | None = None
    ltv: float | None = None
    payback_period_months: int | None = None
    gross_margin_target: float | None = None
    net_margin_target: float | None = None
    customer_type: str | None = None
    customer_segment: str | None = None
    avg_contract_value: float | None = None
    monthly_churn_rate: float | None = None
    team_size: int | None = None
    engineering_headcount: int | None = None
    sales_headcount: int | None = None
    ops_headcount: int | None = None
    contractor_count: int | None = None
    next_fundraise_date: str | None = None
    profitability_target_date: str | None = None
    revenue_target_3m: float | None = None
    revenue_target_6m: float | None = None
    revenue_target_12m: float | None = None
    exit_strategy: str | None = None
    operating_states: str | None = None
    has_gst_registration: bool | None = None
    has_tan_registration: bool | None = None
    gstin: str | None = None
    pan: str | None = None
    auditor_appointed: bool | None = None
    statutory_audit_required: bool | None = None
    current_fy: str | None = None
    profile_completeness: int | None = None
    last_reviewed_at: str | None = None


class CompanyProfileResponse(BaseModel):
    id: str
    user_id: str
    company_name: str | None
    entity_type: str | None
    incorporation_date: str | None
    industry_vertical: str | None
    industry_sub_sector: str | None
    business_model: str | None
    revenue_model: str | None
    avg_deal_size: float | None
    avg_contract_length_months: int | None
    funding_stage: str | None
    last_raise_amount: float | None
    total_capital_raised: float | None
    last_raise_date: str | None
    cash_reserves: float | None
    monthly_burn_rate: float | None
    monthly_revenue: float | None
    runway_target_months: int | None
    cac: float | None
    ltv: float | None
    payback_period_months: int | None
    gross_margin_target: float | None
    net_margin_target: float | None
    customer_type: str | None
    customer_segment: str | None
    avg_contract_value: float | None
    monthly_churn_rate: float | None
    team_size: int | None
    engineering_headcount: int | None
    sales_headcount: int | None
    ops_headcount: int | None
    contractor_count: int | None
    next_fundraise_date: str | None
    profitability_target_date: str | None
    revenue_target_3m: float | None
    revenue_target_6m: float | None
    revenue_target_12m: float | None
    exit_strategy: str | None
    operating_states: str | None
    has_gst_registration: bool
    has_tan_registration: bool
    gstin: str | None
    pan: str | None
    auditor_appointed: bool
    statutory_audit_required: bool
    current_fy: str | None
    profile_completeness: int
    last_reviewed_at: str | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
