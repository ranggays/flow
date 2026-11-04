import json
import re
from fastapi import APIRouter, BackgroundTasks, HTTPException
from ...models.schemas import ChatRequest, MindmapRequest
from ...core.config import supabase, llm, embeddings
from ...services.documents import process_document

router = APIRouter()

@router.post("/api/process-new-documents")
async def trigger_processing(background_task: BackgroundTasks):
    response = supabase.table("documents").select("*").eq("isVectorized", False).execute()
    unprocessed_docs = response.data

    if not unprocessed_docs:
        return {"message": "There is no new document to be processed"}

    for doc in unprocessed_docs:
        background_task.add_task(
            process_document, doc["id"], doc["fileUrl"], doc["workspaceId"]
        )

    return {
        "message": f"Starting processing for {len(unprocessed_docs)} document in background",
        "documents": [d["name"] for d in unprocessed_docs]
    }


@router.post("/api/chat")
async def chat_with_documents(request: ChatRequest):
    try:
        query_vector = embeddings.embed_query(request.message)

        rpc_response = supabase.rpc("match_document_chunks", {
            "query_embedding": query_vector,
            "match_threshold": 0.5,
            "match_count": 5,
            "p_workspace_id": request.workspace_id,
            "p_document_ids": request.document_ids
        }).execute()

        relevant_chunks = rpc_response.data

        if not relevant_chunks:
            return {"answer": "Maaf, saya tidak menemukan informasi yang relevan di dalam dokumen Anda untuk menjawab pertanyaan ini."}

        context_text = "\n\n---\n\n".join([chunk["content"] for chunk in relevant_chunks])

        history_text = ""
        for msg in request.history:
            role_name = "User" if msg.role == "user" else "AI"
            history_text += f"{role_name}: {msg.content}\n"

        prompt = f"""
Anda adalah asisten peneliti yang cerdas dan sangat membantu. Tugas Anda adalah menjawab pertanyaan pengguna BERDASARKAN informasi dari dokumen berikut ini beserta RIWAYAT OBROLAN. Gabungkan juga pemahaman Anda sehingga jawaban lebih lengkap dan jelas.
*JIKA TIDAK ADA KAITAN DENGAN OBROLAN SEBELUMNYA, JAWAB BERDASARKAN KONTEKS DOKUMEN SAJA.

RIWAYAT OBROLAN SEBELUMNYA:
{history_text}

KONTEKS DOKUMEN:
{context_text}

PERTANYAAN PENGGUNA:
{request.message}

JAWABAN:
"""
        ai_response = llm.invoke(prompt)
        raw_content = ai_response.content
        clean_answer = raw_content

        if isinstance(raw_content, str):
            try:
                parsed = json.loads(raw_content)
                if isinstance(parsed, list) and parsed and "text" in parsed[0]:
                    clean_answer = parsed[0]["text"]
            except json.JSONDecodeError:
                pass
        elif isinstance(raw_content, list) and raw_content and "text" in raw_content[0]:
            clean_answer = raw_content[0]["text"]

        return {"answer": clean_answer, "sources": relevant_chunks}

    except Exception as e:
        print(f"Error chat: {e}")
        return {"error": str(e)}


@router.post("/api/v1/generate-mindmap")
async def generate_mindmap_api(req: MindmapRequest):
    try:
        prompt = f"""
Anda adalah asisten ahli yang bertugas membuat struktur mindmap. Baca ringkasan teks berikut dan ekstrak SATU konsep utama (core_concept) serta maksimal 4-5 cabang utama (branches).

SYARAT WAJIB:
1. Jawaban HARUS berupa format JSON murni yang valid.
2. TIDAK BOLEH ADA teks pengantar, penutup, atau format markdown (seperti ```json ).
3. Gunakan struktur persis seperti contoh di bawah ini.

CONTOH FORMAT JSON:
{{
    "core_concept": "Judul Utama (Maks 5 kata)",
    "branches": [
        "Cabang 1 (Maks 5 kata)",
        "Cabang 2 (Maks 5 kata)"
    ]
}}

TEKS RINGKASAN:
{req.summary}
"""
        ai_response = llm.invoke(prompt)
        raw_content = ai_response.content if hasattr(ai_response, "content") else str(ai_response)

        if isinstance(raw_content, list):
            if raw_content and isinstance(raw_content[0], dict) and "text" in raw_content[0]:
                raw_content = "".join([b.get("text", "") for b in raw_content])
            else:
                raw_content = "".join([str(i) for i in raw_content])
        elif not isinstance(raw_content, str):
            raw_content = str(raw_content)

        cleaned_text = raw_content.replace("```json", "").replace("```", "").strip()
        match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
        if match:
            cleaned_text = match.group(0)

        mindmap_data = json.loads(cleaned_text)
        return {"status": "success", "data": mindmap_data}

    except Exception as e:
        print(f"Error generating mindmap: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed creating mindmap structure from summary: {str(e)}"
        )
    
