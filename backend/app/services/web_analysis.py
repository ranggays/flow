import asyncio
from datetime import datetime
from ..core.ai import call_gemini_with_retry, gemini_generate, extract_text_from_gemini, parse_json_safe, parse_json_array_safe, detect_platform

async def _stage1_extract(content_context: str, platform: str) -> dict:
    """
    Tahap 1: Baca konten, hasilkan ringkasan & keywords.
    ✅ call_gemini_with_retry — titik 2
    """
    current_date = datetime.now().strftime("%d %B %Y")
    prompt = f"""
Kamu adalah analis konten profesional.
HARI INI ADALAH TANGGAL: {current_date}

Platform: {platform}
DATA KONTEN:
{content_context}

Baca konten di atas lalu hasilkan JSON berikut (tanpa markdown, tanpa teks lain):
{{
    "contentType": "video|artikel|berita|dll",
    "summary": "ringkasan lengkap minimal 3 kalimat Bahasa Indonesia",
    "mainClaim": "Tuliskan 1 kalimat spesifik yang menjadi klaim atau narasi utama dari konten ini untuk dicek faktanya. (Contoh: 'Kapal Cina tertahan di Selat Hormuz karena takut blokade AS')",
    "keyPoints": ["poin kunci 1", "poin kunci 2", "poin kunci 3"],
    "keywords": ["query pencarian 1", "query pencarian 2"]
}}

Pastikan keywords mencerminkan klaim utama / topik spesifik yang cocok dijadikan query pencarian berita.
"""
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: call_gemini_with_retry(
            lambda: gemini_generate(prompt, use_web_search=False),
            max_retries=4,
            base_delay=3.0,
        )
    )
    raw = extract_text_from_gemini(response)
    return parse_json_safe(raw, {
        "contentType": "unknown",
        "summary": "Gagal mengekstrak ringkasan.",
        "mainClaim": "Tidak ada klaim spesifik",
        "keyPoints": [],
        "keywords": [],
    })



async def _stage2_search(main_claim: str, keywords: list[str]) -> dict:
    """
    Tahap 2: Cari artikel Pro & Kontra secara paralel.
    ✅ call_gemini_with_retry — titik 3a (pro) & titik 3b (con)
    """
    current_date = datetime.now().strftime("%d %B %Y")
    topic_query = ", ".join(keywords)

    async def search_one(instruction: str, label: str) -> str:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(
            None,
            lambda: call_gemini_with_retry(
                lambda: gemini_generate(
                    f"HARI INI ADALAH TANGGAL: {current_date}\n\n{instruction}",
                    use_web_search=True
                ),
                max_retries=4,
                base_delay=3.0,
            )
        )
        return extract_text_from_gemini(res)

    pro_raw, con_raw = await asyncio.gather(
        search_one(
            f"""KLAIM UTAMA: "{main_claim}"
Kata kunci relevan: {topic_query}

Tugasmu: Gunakan Google Search untuk mencari artikel berita/jurnal TERBARU yang MENDUKUNG, MEMBENARKAN, atau SETEMA dengan klaim utama di atas.

⚠️ INSTRUKSI WAKTU SANGAT PENTING:
Pastikan artikel yang kamu temukan relevan dengan LINIMASA (Timeline) kejadian saat ini. Jangan mengambil berita dari kejadian berbulan-bulan/bertahun-tahun lalu meskipun topiknya mirip.

Jawab HANYA JSON array (tanpa markdown):
[{"{"}"title":"...","url":"...","snippet":"ringkasan isi artikel","source":"nama media"{"}"}]
Minimal 3, maksimal 5 item.""",
"pro"
        ),
        search_one(
            f"""KLAIM UTAMA: "{main_claim}"
Kata kunci relevan: {topic_query}

Tugasmu: Gunakan Google Search untuk mencari artikel situs cek-fakta (Turnbackhoax, Kompas Cek Fakta, dll) atau berita terpercaya TERBARU yang MENENTANG, MEMBANTAH, atau MENGKLARIFIKASI SALAH klaim utama di atas.

⚠️ INSTRUKSI WAKTU SANGAT PENTING:
Bantahan HARUS relevan dengan kronologi kejadian pada klaim utama (terjadi di sekitar waktu yang sama). JANGAN PERNAH mengambil artikel bantahan dari bulan lalu atau tahun lalu untuk menyanggah kejadian yang baru saja terjadi hari ini. 
Jika belum ada artikel yang membantah kejadian terbaru ini, KEMBALIKAN ARRAY KOSONG [].

Jawab HANYA JSON array (tanpa markdown):
[{"{"}"title":"...","url":"...","snippet":"ringkasan bantahan dari artikel","source":"nama media"{"}"}]
Maksimal 5 item.""",
"con"
        ),
    )

    return {
        "pro": parse_json_array_safe(pro_raw, []),
        "con": parse_json_array_safe(con_raw, []),
    }



async def _stage3_judge(content_context: str, search_results: dict, main_claim: str) -> dict:
    """
    Tahap 3: Verdict hoaks berdasarkan konten + hasil pencarian.
    ✅ call_gemini_with_retry — titik 4
    """
    current_date = datetime.now().strftime("%d %B %Y")
    def fmt_articles(items: list) -> str:
        if not items:
            return "  (tidak ada artikel)"
        lines = []
        for i, a in enumerate(items, 1):
            lines.append(
                f"  [{i}] {a.get('title', '?')} — {a.get('source', '?')}\n"
                f"      {a.get('snippet', '')}"
            )
        return "\n".join(lines)

    prompt = f"""
Kamu adalah fact-checker profesional. HARI INI ADALAH TANGGAL: {current_date}.
Perhatikan bahwa jika tanggal konten berdekatan dengan tanggal hari ini, itu BUKAN konten dari masa depan.

── ISI KONTEN ASLI ────────────────────────────────────────────────────────
{content_context}

── KLAIM UTAMA YANG DIUJI ──────────────────────────────────────────────────
{main_claim}

── ARTIKEL PENDUKUNG (pro) ─────────────────────────────────────────────────
{fmt_articles(search_results['pro'])}

── ARTIKEL PEMBANTAH / KLARIFIKASI (kontra) ────────────────────────────────
{fmt_articles(search_results['con'])}

Tugas: Evaluasi apakah klaim utama tersebut VALID, HOAX, atau MISLEADING berdasarkan perbandingan dengan artikel Pro dan Kontra di atas.
Hasilkan JSON berikut (tanpa markdown):
{{
    "verdict": "VALID|HOAX|MISLEADING|UNVERIFIED",
    "confidence": 0-100,
    "reasoning": "Penjelasan 2-4 kalimat Bahasa Indonesia. JANGAN mempermasalahkan tanggal konten (kecuali terpaut bertahun-tahun). Sebutkan nama media/artikel dari panel di atas sebagai dasar keputusan. Contoh: 'Berdasarkan bantahan dari Kompas.TV (panel Kontra no.1)...'"
}}
"""
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: call_gemini_with_retry(
            lambda: gemini_generate(prompt, use_web_search=False),
            max_retries=4,
            base_delay=3.0,
        )
    )
    raw = extract_text_from_gemini(response)
    return parse_json_safe(raw, {
        "verdict": "UNVERIFIED",
        "confidence": 0,
        "reasoning": "Gagal menentukan verdict.",
    })

