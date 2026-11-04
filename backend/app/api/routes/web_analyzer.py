from fastapi import APIRouter, HTTPException
from ...models.schemas import WebAnalyzeRequest, WebChatRequest
from ...core.config import llm
from ...services.media import get_full_content, scrape_web_article
from ...services.web_analysis import _stage1_extract, _stage2_search, _stage3_judge
from ...core.ai import detect_platform

router = APIRouter()

@router.post("/api/web-analyzer/analyze")
async def web_analyzer_analyze(req: WebAnalyzeRequest):
    """
    Pipeline lengkap dalam satu endpoint:
      Tahap 1 → Ekstraksi konten  (tanpa search, cepat)
      Tahap 2 → Cari Pro & Kontra (Google Search, paralel)
      Tahap 3 → Verdict hoaks     (tanpa search, reasoning nyambung dengan UI)
    """
    try:
        platform = detect_platform(req.url)
        content_context = ""

        if platform in ("youtube", "tiktok"):
            raw_data = await get_full_content(req.url, platform)
            if "error" in raw_data:
                content_context = f"Gagal mengambil konten: {raw_data['error']}"
            else:
                transcript = raw_data.get("transcript", "")
                content_context = f"""
METADATA VIDEO {platform.upper()}:
- Judul    : {raw_data['title']}
- Creator  : {raw_data['uploader']}
- Durasi   : {raw_data['duration']}
- Tanggal  : {raw_data['upload_date']}
- Views    : {raw_data['view_count']:,}
- Likes    : {raw_data['like_count']:,}
- Tags     : {', '.join(raw_data['tags']) if raw_data['tags'] else '-'}
- Deskripsi: {raw_data['description']}

TRANSKRIP VIDEO:
{transcript if transcript else '(Transkrip tidak tersedia, analisis berdasarkan metadata & deskripsi)'}
""".strip()

        elif platform == "web":
            web_data = await scrape_web_article(req.url)
            content_context = (
                f"JUDUL  : {web_data['title']}\n"
                f"KONTEN : {web_data['content']}"
            )

        # ── Tahap 1: Ekstraksi ───────────────────────────────────────────────
        print("[pipeline] ▶ Tahap 1 — Ekstraksi konten...")
        extraction = await _stage1_extract(content_context, platform)
        print(f"[pipeline]   keywords: {extraction['keywords']}")
        print(f"[mainClaim]   mainClaim: {extraction['mainClaim']}")

        # ── Tahap 2: Pencarian Pro/Kontra (paralel) ──────────────────────────
        print("[pipeline] ▶ Tahap 2 — Pencarian Pro & Kontra (paralel)...")
        search_results = await _stage2_search(extraction["mainClaim"], extraction["keywords"])
        print(f"[pipeline]   pro: {len(search_results['pro'])} | con: {len(search_results['con'])}")

        # ── Tahap 3: Verdict Hoaks ───────────────────────────────────────────
        print("[pipeline] ▶ Tahap 3 — Menentukan verdict...")
        hoax_check = await _stage3_judge(content_context, search_results, extraction["mainClaim"])
        print(f"[pipeline]   verdict: {hoax_check.get('verdict')} ({hoax_check.get('confidence')}%)")

        # ── Gabungkan semua hasil ────────────────────────────────────────────
        result = {
            "platform":      platform,
            "contentType":   extraction["contentType"],
            "summary":       extraction["summary"],
            "mainClaim":     extraction["mainClaim"],
            "keyPoints":     extraction["keyPoints"],
            "keywords":      extraction["keywords"],
            "hoaxCheck":     hoax_check,
            "searchResults": search_results,
        }

        print("[pipeline] ✓ Selesai")
        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/web-analyzer/chat")
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


