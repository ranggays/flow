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



class MindmapRequest(BaseModel):
    summary: str



class WebAnalyzeRequest(BaseModel):
    url: str



class WebChatMessage(BaseModel):
    role: str
    content: str



class WebChatRequest(BaseModel):
    messages: List[WebChatMessage]
    analysis_context: str



class YoutubeCommentRequest(BaseModel):
    url: str



class TiktokCommentRequest(BaseModel):
    url: str

