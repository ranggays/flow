import uuid
import json
import re
import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from pypdf import PdfReader
from io import BytesIO
from pydantic import BaseModel
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

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

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# gae inisialisasi supabase
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# milih model
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
# milih model gae embedding
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))


# fungsi gae proses pdf
def process_document(doc_id: str, file_url: str, workspace_id: str):
    print(f"Start processing document: {doc_id}")
    try:
        # download pdf teko supabase
        file_path = file_url.split("/documents/")[-1]

        response = supabase.storage.from_("documents").download(file_path)
        pdf_file = BytesIO(response)

        # moco teks pdf
        pdf_reader = PdfReader(pdf_file)
        full_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

        if not full_text.strip():
            raise Exception("Document is empty or text cant be read")
        
        # gae summary mbe gemini
        text_for_summary = full_text[:3000]
        prompt = f"Buatkan ringkasan singkat (maksimal 2-3 kalimat) dalam bahasa Indonesia tentang dokumen berikut secara jelas dan lengkap:\n\n{text_for_summary}"
        summary_response = llm.invoke(prompt)
        summary = summary_response.content

        # chunking teks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size = 1000, # 1000 karakter per potong
            chunk_overlap = 200 # overlap 200 karakter agar konteks antar paragraf tidak hilang
        )
        chunks = text_splitter.split_text(full_text)
        print(f"Document is pieced to {len(chunks)} chunks")

        # embedding (ubah teks dadi vektor) & simpan database
        for chunk_text in chunks:
            # generate vector
            vector = embeddings.embed_query(chunk_text)
            # insert nang database
            supabase.table("document_chunks").insert({
                "id": str(uuid.uuid4()),
                "documentId": doc_id,
                "content": chunk_text,
                "embedding": vector
            }).execute()

        # update status dokumen (ws bar diproses)
        supabase.table("documents").update({
            "summary": summary,
            "isVectorized": True
        }).eq("id", doc_id).execute()

        print(f"Success processing document {doc_id}")
    
    except Exception as e:
        print(f"Error processing document {doc_id}: {str(e)}")

# endpoint API gae di hit next (FE)
@app.post("/api/process-new-documents")
async def trigger_processing(background_task: BackgroundTasks):
    """
    This Endpoint will find a document that havent been vectorized, then process it in the background so that API respons faster
    """
    # golek dokumen sg durung di vectorized (false)
    response = supabase.table("documents").select("*").eq("isVectorized", False).execute()
    unprocessed_docs = response.data

    if not unprocessed_docs:
        return {"message": "There is no new document to be processed"}
    
    # lebokne tugas ng background cek next js gak ngenti kesuwen
    for doc in unprocessed_docs:
        background_task.add_task(process_document, doc["id"], doc["fileUrl"], doc["workspaceId"])

    return {
        "message": f"Starting processing for {len(unprocessed_docs)} document in backgroun",
        "documents": [d["name"] for d in unprocessed_docs]
    }

@app.post("/api/chat")
async def chat_with_documents(request: ChatRequest):
    try:
        # 1. ubah pertanyaan user dadi vektor
        query_vector = embeddings.embed_query(request.message)

        # 2. golek potongan dokumen sg mirip/sesuai mbe nde sg supabase
        # nyeluk fungsi sql 'match_document_chunks'
        rpc_response = supabase.rpc("match_document_chunks", {
            "query_embedding": query_vector,
            "match_threshold": 0.5, # min mirip 50%
            "match_count": 5, # jupuk 5 potongan teks terbaik
            "p_workspace_id": request.workspace_id,
            "p_document_ids": request.document_ids
        }).execute()

        relevant_chunks = rpc_response.data

        # 3. gabungno potongan teks sg di temoni dadi sak konteks
        if not relevant_chunks:
            return {"answer": "Maaf, saya tidak menemukan informasi yang relevan di dalam dokumen Anda untuk menjawab pertanyaan ini."}
        
        context_text = "\n\n---\n\n".join([chunk["content"] for chunk in relevant_chunks])

        history_text = ""
        for msg in request.history:
            role_name = "User" if msg.role == "user" else "AI"
            history_text += f"{role_name}: {msg.content}"

        # 4. nyusun prompt gae llm e
        prompt = f"""
        Anda adalah asisten peneliti yang cerda dan sangat membantu. Tugas Anda adalah menjawab pertanyaan pengguna BERDASARKAN informasi dari dokumen berikut ini beserta RIWAYAT OBROLAN. Selain itu gabungkan juga dari pemahaman kamu terkait pertanyaan tersebut dan konteks yang disediakan sehingga jawaban menjadi lebih lengkap dan jelas. 
        *JIKA TIDAK ADA HUBUNGAN ATAU KAITAN TERKAIT PERTANYAAN SEKARANG DENGAN OBROLAN SEBELUMNYA JAWAB BERDASARKAN KONTEKS DOKUMEN SAJA

        RIWAYAT OBROLAN SEBELUMNYA:
        {history_text}

        KONTEKS DOKUMEN:
        {context_text}

        PERTANYAAN_PENGGUNA:
        {request.message}

        JAWABAN:
        """

        # 5. celuk gemini gae jawab
        ai_response = llm.invoke(prompt)
        raw_content = ai_response.content
        clean_answer = raw_content

        if isinstance(raw_content, str):
            try:
                parsed_content = json.loads(raw_content)
                if isinstance(parsed_content, list) and len(parsed_content) > 0 and "text" in parsed_content[0]:
                    clean_answer = parsed_content[0]["text"]
            except json.JSONDecodeError:
                pass
        elif isinstance(raw_content, list) and len(raw_content) > 0 and "text" in raw_content[0]:
            clean_answer = raw_content[0]["text"]

        return{
            "answer": clean_answer,
            "sources": relevant_chunks
        }
    
    except Exception as e:
        print (f"Error chat: {e}")
        return {"error": str(e)}
    
@app.post("/api/v1/generate-mindmap")
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
            if len(raw_content) > 0 and isinstance(raw_content[0], dict) and "text" in raw_content[0]:
                raw_content = "".join([block.get("text", "") for block in raw_content])
            else:
                # Jika isinya list biasa
                raw_content = "".join([str(item) for item in raw_content])
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
        raise HTTPException(status_code=500, detail=f"Failed creating mindmap structure from summary: str{e}")