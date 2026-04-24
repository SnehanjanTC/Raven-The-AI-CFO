from pydantic import BaseModel
from datetime import date
from typing import Optional

class FilingCreate(BaseModel):
    type: str
    period: str
    due_date: date
    amount: float = 0
    portal: Optional[str] = None
    notes: Optional[str] = None

class FilingUpdate(BaseModel):
    status: Optional[str] = None
    filed_date: Optional[date] = None
    ack_number: Optional[str] = None
    penalty: Optional[float] = None
    notes: Optional[str] = None

class FilingResponse(BaseModel):
    id: str
    type: str
    period: str
    due_date: date
    filed_date: Optional[date]
    status: str
    amount: float
    penalty: float
    ack_number: Optional[str]
    portal: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True
