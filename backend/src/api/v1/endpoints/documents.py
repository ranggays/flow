from fastapi import APIRouter, BackgroundTasks
from src.services.document_service import trigger_processing

router = APIRouter()

@router.post("/process-new-documents")
async def process_document(background_task: BackgroundTasks):
    return await trigger_processing(background_task)