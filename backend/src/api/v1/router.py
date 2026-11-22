from fastapi import APIRouter
from src.api.v1.endpoints import documents, chat, mindmap

router_api = APIRouter()

router_api.include_router(documents.router, tags=["Documents"])
router_api.include_router(chat.router, tags=["Chat"])
router_api.include_router(mindmap.router, tags=["Mindmap"])

