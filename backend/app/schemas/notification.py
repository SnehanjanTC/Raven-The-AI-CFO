from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    type: str
    source: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
