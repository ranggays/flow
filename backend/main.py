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
from typing import List, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

import asyncio
import tempfile
import urllib.request
import yt_dlp
import httpx
import time

# ── NEW: pakai google.genai (bukan google.generativeai yang deprecated) ──────
from google import genai
from google.genai import types

from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi


# ─── Pydantic Models ──────────────────────────────────────────────────────────

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

class WebSearchRequest(BaseModel):
    keywords: list[str]

class WebChatMessage(BaseModel):
    role: str
    content: str

# ── FIX: WebChatRequest sebelumnya tidak didefinisikan ────────────────────────
class WebChatRequest(BaseModel):
    messages: List[WebChatMessage]
    analysis_context: str


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ─── Inisialisasi Supabase ────────────────────────────────────────────────────
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# ─── LangChain models (tidak berubah) ────────────────────────────────────────
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# ─── NEW: google.genai client ────────────────────────────────────────────────
genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Config untuk model dengan Google Search tool
_web_search_config = types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())]
)


# ─── Helper: generate_content wrapper ────────────────────────────────────────

def gemini_generate(prompt: str | list, use_web_search: bool = False) -> object:
    """
    Wrapper generate_content untuk menggantikan genai.GenerativeModel.generate_content().
    - use_web_search=True  → pakai Google Search tool (ex: web_llm)
    - use_web_search=False → plain generation (ex: gemini_flash)
    """
    config = _web_search_config if use_web_search else None
    return genai_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def process_document(doc_id: str, file_url: str, workspace_id: str):
    print(f"Start processing document: {doc_id}")
    try:
        file_path = file_url.split("/documents/")[-1]
        response = supabase.storage.from_("documents").download(file_path)
        pdf_file = BytesIO(response)

        pdf_reader = PdfReader(pdf_file)
        full_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

        if not full_text.strip():
            raise Exception("Document is empty or text cant be read")

        text_for_summary = full_text[:3000]
        prompt = (
            "Buatkan ringkasan singkat (maksimal 2-3 kalimat) dalam bahasa Indonesia "
            f"tentang dokumen berikut secara jelas dan lengkap:\n\n{text_for_summary}"
        )
        summary_response = llm.invoke(prompt)
        summary = summary_response.content

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(full_text)
        print(f"Document is pieced to {len(chunks)} chunks")

        for chunk_text in chunks:
            vector = embeddings.embed_query(chunk_text)
            supabase.table("document_chunks").insert({
                "id": str(uuid.uuid4()),
                "documentId": doc_id,
                "content": chunk_text,
                "embedding": vector
            }).execute()

        supabase.table("documents").update({
            "summary": summary,
            "isVectorized": True
        }).eq("id", doc_id).execute()

        print(f"Success processing document {doc_id}")

    except Exception as e:
        print(f"Error processing document {doc_id}: {str(e)}")


def detect_platform(url: str) -> str:
    if re.search(r"youtube\.com|youtu\.be", url, re.I):
        return "youtube"
    if re.search(r"tiktok\.com", url, re.I):
        return "tiktok"
    return "web"


def parse_json_safe(raw: str, fallback):
    try:
        cleaned = re.sub(r"```json\s?|```", "", raw).strip()
        return json.loads(cleaned)
    except Exception:
        return fallback


def extract_text_from_gemini(response) -> str:
    """Ekstrak teks dari response google.genai (bukan generativeai lama)."""
    try:
        # Cara baru: response.text langsung tersedia di google.genai
        return response.text
    except Exception:
        # Fallback: iterasi candidates
        texts = []
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "text") and part.text:
                    texts.append(part.text)
        return "\n".join(texts)


def download_audio(url: str, output_path: str) -> Optional[str]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "format": "bestaudio[filesize<25M]/bestaudio/best",
        "outtmpl": output_path,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "64",
        }],
        "download_range": None,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        mp3_path = output_path + ".mp3"
        if os.path.exists(mp3_path):
            return mp3_path
        if os.path.exists(output_path):
            return output_path
        return None
    except Exception as e:
        print(f"Error downloading audio: {e}")
        return None


def upload_audio_to_gemini(file_path: str) -> Optional[object]:
    """
    Upload file audio ke Gemini Files API (google.genai baru).
    Return file object, None jika gagal.
    """
    try:
        print(f"[upload_audio] Uploading {file_path}...")

        # ── NEW API ──────────────────────────────────────────────────────────
        audio_file = genai_client.files.upload(
            file=file_path,
            config=types.UploadFileConfig(
                mime_type="audio/mpeg",
                display_name=os.path.basename(file_path),
            ),
        )

        max_wait = 60
        waited = 0
        while audio_file.state == types.FileState.PROCESSING and waited < max_wait:
            print(f"[upload_audio] Waiting for processing... ({waited}s)")
            time.sleep(2)
            waited += 2
            audio_file = genai_client.files.get(name=audio_file.name)  # ── NEW

        if audio_file.state == types.FileState.FAILED:
            print("[upload_audio] File processing failed")
            return None

        print(f"[upload_audio] Upload successful: {audio_file.name}")
        return audio_file

    except Exception as e:
        print(f"Error uploading audio: {e}")
        return None


def transcribe_with_gemini(audio_file_obj: object, platform: str) -> str:
    try:
        prompt = """
Transkrip seluruh isi audio berikut ke dalam teks bahasa Indonesia. Jika audio dalam bahasa lain (misal Inggris), tetap transkrip apa adanya lalu tambahkan terjemahan Indonesia di bawahnya.

Format output:
TRANSKRIP ASLI:
[isi transkrip]

TERJEMAHAN (jika bukan Bahasa Indonesia):
[terjemahan jika diperlukan]

Pastikan transkrip selengkap mungkin. Jika ada bagian yang tidak jelas, tulis [tidak jelas].
"""
        # ── NEW: kirim file object + prompt sebagai list ──────────────────────
        response = gemini_generate([audio_file_obj, prompt], use_web_search=False)
        return extract_text_from_gemini(response)

    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return ""


def cleanup_files(local_path: Optional[str], gemini_file_obj=None):
    if local_path and os.path.exists(local_path):
        try:
            os.remove(local_path)
            print(f"Deleted local file: {local_path}")
        except Exception:
            pass

    if gemini_file_obj:
        try:
            genai_client.files.delete(name=gemini_file_obj.name)  # ── NEW
            print(f"Deleted Gemini file: {gemini_file_obj.name}")
        except Exception:
            pass


def get_metadata_ytdlp(url: str) -> dict:
    ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {"error": "Failed to extract metadata"}
            info = ydl.sanitize_info(info)
            return {
                "title":       info.get("title", ""),
                "description": (info.get("description") or "")[:2000],
                "uploader":    info.get("uploader") or info.get("channel", ""),
                "upload_date": info.get("upload_date", ""),
                "duration":    info.get("duration_string") or str(info.get("duration", "")),
                "view_count":  info.get("view_count") or 0,
                "like_count":  info.get("like_count") or 0,
                "tags":        (info.get("tags") or [])[:10],
            }
    except Exception as e:
        return {"error": str(e)}


def get_youtube_subtitle(url: str) -> str:
    try:
        video_id = re.search(r"(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})", url)
        if not video_id:
            return ""
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id.group(1), languages=["id", "en"]
        )
        return " ".join([t["text"] for t in transcript])[:5000]
    except Exception:
        return ""


async def scrape_web_article(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            res = await client.get(url, headers=headers)
            soup = BeautifulSoup(res.text, "html.parser")

            title = ""
            if soup.find("h1"):
                title = soup.find("h1").get_text(strip=True)
            elif soup.find("title"):
                title = soup.find("title").get_text(strip=True)

            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            article = soup.find("article") or soup.find(
                "div", class_=re.compile(r"content|article|post|body", re.I)
            )
            text = (article or soup).get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text).strip()

            return {"title": title, "content": text[:5000]}
    except Exception as e:
        return {"title": "", "content": f"Gagal fetch: {str(e)}"}


async def get_full_content(url: str, platform: str) -> dict:
    loop = asyncio.get_event_loop()

    meta = await loop.run_in_executor(None, get_metadata_ytdlp, url)
    if "error" in meta:
        return {"error": meta["error"], "transcript": ""}

    transcript = ""

    if platform == "youtube":
        transcript = await loop.run_in_executor(None, get_youtube_subtitle, url)
        if transcript:
            print("[transcript] Menggunakan subtitle YouTube yang tersedia")

    if not transcript:
        print(f"[transcript] Tidak ada subtitle, mulai download audio dari {platform}...")
        tmp_dir = tempfile.gettempdir()
        tmp_filename = os.path.join(tmp_dir, f"audio_{uuid.uuid4().hex}")

        audio_path = None
        gemini_file = None

        try:
            audio_path = await loop.run_in_executor(None, download_audio, url, tmp_filename)

            if audio_path:
                file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
                print(f"[transcript] Audio size: {file_size_mb:.1f} MB")

                if file_size_mb <= 25:
                    gemini_file = await loop.run_in_executor(
                        None, upload_audio_to_gemini, audio_path
                    )
                    if gemini_file:
                        transcript = await loop.run_in_executor(
                            None, transcribe_with_gemini, gemini_file, platform
                        )
                        print(f"[transcript] Berhasil, panjang: {len(transcript)} karakter")
                    else:
                        transcript = "(Gagal upload audio ke Gemini)"
                else:
                    transcript = f"(File audio terlalu besar: {file_size_mb:.1f}MB > 25MB)"
            else:
                transcript = "(Gagal download audio dari URL ini)"

        finally:
            cleanup_files(audio_path, gemini_file)

    meta["transcript"] = transcript
    return meta


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/web-analyzer/analyze")
async def web_analyzer_analyze(req: WebAnalyzeRequest):
    try:
        platform = detect_platform(req.url)
        content_context = ""

        if platform in ("youtube", "tiktok"):
            data = await get_full_content(req.url, platform)

            if "error" in data:
                content_context = f"Gagal mengambil konten: {data['error']}"
            else:
                label = "YOUTUBE" if platform == "youtube" else "TIKTOK"
                transcript = data.get("transcript", "")
                content_context = f"""
METADATA VIDEO {label}:
- Judul    : {data['title']}
- Creator  : {data['uploader']}
- Durasi   : {data['duration']}
- Tanggal  : {data['upload_date']}
- Views    : {data['view_count']:,}
- Likes    : {data['like_count']:,}
- Tags     : {', '.join(data['tags']) if data['tags'] else '-'}
- Deskripsi: {data['description']}

TRANSKRIP VIDEO:
{transcript if transcript else '(Transkrip tidak tersedia)'}
""".strip()

        elif platform == "web":
            web_data = await scrape_web_article(req.url)
            content_context = f"""
JUDUL  : {web_data['title']}
KONTEN : {web_data['content']}
""".strip()

        prompt = f"""
Kamu adalah AI pemeriksa fakta dan analisis konten profesional.

URL     : {req.url}
Platform: {platform}

DATA KONTEN:
{content_context}

Gunakan Google Search untuk verifikasi fakta dari konten di atas. Jawab HANYA dengan JSON valid (tanpa markdown):
{{
    "platform": "{platform}",
    "contentType": "video|artikel|dll",
    "summary": "ringkasan lengkap minimal 3 kalimat Bahasa Indonesia",
    "keyPoints": ["poin 1", "poin 2", "poin 3"],
    "hoaxCheck": {{
        "verdict": "VALID|HOAX|MISLEADING|UNVERIFIED",
        "confidence": 0-100,
        "reasoning": "penjelasan detail berdasarkan bukti dalam Bahasa Indonesia"
    }},
    "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}}
"""
        # ── NEW: pakai gemini_generate dengan web search ──────────────────────
        response = gemini_generate(prompt, use_web_search=True)
        raw_text = extract_text_from_gemini(response)

        result = parse_json_safe(raw_text, {
            "platform": platform,
            "contentType": "unknown",
            "summary": "Gagal menganalisis.",
            "keyPoints": [],
            "hoaxCheck": {"verdict": "UNVERIFIED", "confidence": 0, "reasoning": "Gagal."},
            "keywords": [],
        })

        return {"success": True, "data": result}

    except Exception as e:
        print(f"[analyze] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/web-analyzer/search")
async def web_analyzer_search(req: WebSearchRequest):
    try:
        topic_query = ", ".join(req.keywords)

        async def search_one(instruction: str, msg: str) -> str:
            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(
                None,
                lambda: gemini_generate(f"{instruction}\n\nTopik: {msg}", use_web_search=True)
            )
            return extract_text_from_gemini(res)

        pro_raw, con_raw = await asyncio.gather(
            search_one(
                """Cari artikel yang MENDUKUNG topik berikut.
Prioritaskan media berita terpercaya & jurnal akademik.
Jawab HANYA JSON array (tanpa markdown):
[{"title":"...","url":"...","snippet":"ringkasan Bahasa Indonesia","source":"nama media"}]
Minimal 3, maksimal 5 item.""",
                topic_query
            ),
            search_one(
                """Cari artikel yang MENENTANG atau MEMBANTAH topik berikut.
Prioritaskan situs fact-check (Turnbackhoax, Kompas Cek Fakta, AFP, Reuters).
Jawab HANYA JSON array (tanpa markdown):
[{"title":"...","url":"...","snippet":"ringkasan Bahasa Indonesia","source":"nama media"}]
Minimal 3, maksimal 5 item.""",
                topic_query
            ),
        )

        return {
            "success": True,
            "data": {
                "pro": parse_json_safe(pro_raw, []),
                "con": parse_json_safe(con_raw, []),
            }
        }

    except Exception as e:
        print(f"[search] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/web-analyzer/chat")
async def web_analyzer_chat(req: WebChatRequest):
    try:
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

        lc_messages = [SystemMessage(content=f"""Kamu adalah asisten riset konten sosial media.

Konteks analisis:
{req.analysis_context}

Jawab dalam Bahasa Indonesia. Gunakan konteks di atas sebagai dasar jawaban utama.
Format dengan markdown jika membantu kejelasan.""")]

        for m in req.messages:
            if m.role == "user":
                lc_messages.append(HumanMessage(content=m.content))
            else:
                lc_messages.append(AIMessage(content=m.content))

        response = llm.invoke(lc_messages)
        return {"success": True, "data": response.content}

    except Exception as e:
        print(f"[chat] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process-new-documents")
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


@app.post("/api/chat")
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
Anda adalah asisten peneliti yang cerdas dan sangat membantu. Tugas Anda adalah menjawab pertanyaan pengguna BERDASARKAN informasi dari dokumen berikut ini beserta RIWAYAT OBROLAN. Selain itu gabungkan juga dari pemahaman kamu terkait pertanyaan tersebut dan konteks yang disediakan sehingga jawaban menjadi lebih lengkap dan jelas.
*JIKA TIDAK ADA HUBUNGAN ATAU KAITAN TERKAIT PERTANYAAN SEKARANG DENGAN OBROLAN SEBELUMNYA JAWAB BERDASARKAN KONTEKS DOKUMEN SAJA

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
                parsed_content = json.loads(raw_content)
                if isinstance(parsed_content, list) and len(parsed_content) > 0 and "text" in parsed_content[0]:
                    clean_answer = parsed_content[0]["text"]
            except json.JSONDecodeError:
                pass
        elif isinstance(raw_content, list) and len(raw_content) > 0 and "text" in raw_content[0]:
            clean_answer = raw_content[0]["text"]

        return {"answer": clean_answer, "sources": relevant_chunks}

    except Exception as e:
        print(f"Error chat: {e}")
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
        raise HTTPException(
            status_code=500,
            detail=f"Failed creating mindmap structure from summary: {str(e)}"
        )