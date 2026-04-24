from pydantic import BaseModel
from datetime import date
from typing import Optional

class InvoiceCreate(BaseModel):
    invoice_no: str
    client_name: str
    client_gstin: Optional[str] = None
    issue_date: date
    due_date: date
    amount: float
    gst_amount: float = 0
    tds_amount: float = 0
    total_amount: float
    status: str = "draft"
    hsn_code: Optional[str] = None
    place_of_supply: Optional[str] = None
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_no: str
    client_name: str
    client_gstin: Optional[str]
    issue_date: date
    due_date: date
    amount: float
    gst_amount: float
    tds_amount: float
    total_amount: float
    status: str
    payment_date: Optional[date]
    hsn_code: Optional[str]
    place_of_supply: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True
