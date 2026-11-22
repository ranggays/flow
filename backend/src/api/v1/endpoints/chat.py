from fastapi import APIRouter
from src.schemas import ChatRequest
from src.services.chat_service import chat_with_documents

router = APIRouter()

@router.post("/chat")
async def chat(request: ChatRequest):
    return await chat_with_documents(request)
