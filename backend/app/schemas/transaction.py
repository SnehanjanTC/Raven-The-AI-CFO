from pydantic import BaseModel
from datetime import date
from typing import Optional

class TransactionCreate(BaseModel):
    date: date
    description: str
    amount: float
    type: str  # debit, credit
    category: str
    subcategory: Optional[str] = None
    vendor: Optional[str] = None
    invoice_no: Optional[str] = None
    status: str = "pending"
    tds_section: Optional[str] = None
    tds_rate: Optional[float] = None
    tds_amount: Optional[float] = None
    gst_rate: Optional[float] = None
    gst_amount: Optional[float] = None
    hsn_code: Optional[str] = None
    bank_ref: Optional[str] = None
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    date: date
    description: str
    amount: float
    type: str
    category: str
    subcategory: Optional[str]
    vendor: Optional[str]
    invoice_no: Optional[str]
    status: str
    tds_section: Optional[str]
    tds_rate: Optional[float]
    tds_amount: Optional[float]
    gst_rate: Optional[float]
    gst_amount: Optional[float]
    hsn_code: Optional[str]
    bank_ref: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True

class TransactionFilter(BaseModel):
    type: Optional[str] = None  # debit, credit
    category: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None
