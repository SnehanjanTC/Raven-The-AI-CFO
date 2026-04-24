from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportCreate(BaseModel):
    name: str
    type: str
    period: str
    version: str = "v1.0"

class ReportResponse(BaseModel):
    id: str
    name: str
    type: str
    period: str
    version: str
    status: str
    icon: str
    data_json: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
