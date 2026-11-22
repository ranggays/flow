from pydantic import BaseModel

class MindmapRequest(BaseModel):
    summary: str