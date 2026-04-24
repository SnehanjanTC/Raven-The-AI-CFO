from pydantic import BaseModel
from typing import Optional

class TDSCalculationRequest(BaseModel):
    section: str  # 194C, 194J, 194H, etc.
    amount: float
    pan_available: bool = True
    is_resident: bool = True

class TDSCalculationResponse(BaseModel):
    section: str
    base_rate: float
    applicable_rate: float
    tds_amount: float
    surcharge: float
    cess: float
    total_deduction: float
    threshold: float
    explanation: str

class GSTCalculationRequest(BaseModel):
    amount: float
    hsn_code: Optional[str] = None
    is_interstate: bool = False
    is_composition: bool = False

class GSTCalculationResponse(BaseModel):
    taxable_amount: float
    cgst_rate: float
    sgst_rate: float
    igst_rate: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_gst: float
    total_with_gst: float
    explanation: str

class PTaxCalculationRequest(BaseModel):
    state: str  # MH, KA, WB, etc.
    monthly_salary: float

class PTaxCalculationResponse(BaseModel):
    state: str
    monthly_salary: float
    monthly_ptax: float
    annual_ptax: float
    slab: str
    explanation: str

class ComplianceHealthResponse(BaseModel):
    tds_score: int
    gst_score: int
    ptax_score: int
    gaap_score: int
    overall_score: int
    total_overdue: int
    critical_deadlines: int

class DeadlineResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    due_date: str
    urgency: str
    type: str
    is_completed: bool

    class Config:
        from_attributes = True
