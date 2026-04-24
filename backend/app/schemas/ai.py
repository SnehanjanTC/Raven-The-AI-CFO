from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    provider: Optional[str] = None  # openai, anthropic, gemini, grok
    context: Optional[str] = None  # additional system context
    stream: bool = False

class ChatResponse(BaseModel):
    content: str
    provider: str
    tokens_used: Optional[int] = None
