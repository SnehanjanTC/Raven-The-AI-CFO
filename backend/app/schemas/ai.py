from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: Optional[str] = None  # additional system context
    stream: bool = False
    conversation_id: Optional[str] = None  # for tracking usage

class ChatResponse(BaseModel):
    content: str
    tokens_used: Optional[int] = None
