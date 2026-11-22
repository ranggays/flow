from pydantic import BaseModel
from typing import List

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    workspace_id: str
    message: str
    history: List[ChatMessage] = []
    document_ids: List[str] = []