from fastapi import APIRouter
from src.schemas import MindmapRequest
from src.services.mindmap_service import generate_mindmap_api

router = APIRouter()

@router.post("/generate-mindmap")
async def mindmap(request: MindmapRequest):
    return await generate_mindmap_api(request)