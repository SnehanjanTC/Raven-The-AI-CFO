from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IntegrationCreate(BaseModel):
    provider: str
    display_name: str
    category: str
    credentials: dict  # Raw credentials - will be encrypted server-side
    environment: str = "sandbox"

class IntegrationUpdate(BaseModel):
    credentials: Optional[dict] = None
    environment: Optional[str] = None
    status: Optional[str] = None

class IntegrationResponse(BaseModel):
    id: str
    provider: str
    display_name: str
    category: str
    status: str
    environment: str
    last_sync: Optional[datetime]
    sync_count: int
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class IntegrationTestRequest(BaseModel):
    provider: str
    credentials: dict
    environment: str = "sandbox"

class IntegrationTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[int] = None
