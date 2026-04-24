from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role: str
    department: Optional[str] = None
    state: str
    monthly_salary: float
    pan: Optional[str] = None
    pf_number: Optional[str] = None
    esi_number: Optional[str] = None

class EmployeeUpdate(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    monthly_salary: Optional[float] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    role: str
    department: Optional[str]
    state: str
    monthly_salary: float
    ptax_monthly: float
    is_active: bool

    class Config:
        from_attributes = True
