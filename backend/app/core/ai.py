import json
import re
import time
from .config import genai_client, types

def gemini_generate(prompt: str | list, use_web_search: bool = False):
    """Panggil Gemini tanpa retry — dipakai oleh call_gemini_with_retry."""
    return genai_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=_websearch_config if use_web_search else _plain_config,
    )



def call_gemini_with_retry(fn, max_retries: int = 4, base_delay: float = 3.0):
    """
    Panggil fungsi Gemini dengan retry otomatis saat kena 503/429.
    Exponential backoff: 3s → 6s → 12s → 24s
    Dipanggil di: transcribe_with_gemini, _stage1_extract, _stage2_search, _stage3_judge
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            error_str = str(e)
            is_retryable = any(code in error_str for code in [
                "503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded"
            ])
            if is_retryable and attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)  # 3, 6, 12, 24 detik
                print(f"[retry] Gemini {e.__class__.__name__} (attempt {attempt + 1}/{max_retries}), retry in {delay:.0f}s...")
                time.sleep(delay)
                last_error = e
            else:
                raise e
    raise last_error



def detect_platform(url: str) -> str:
    if re.search(r"youtube\.com|youtu\.be", url, re.I):
        return "youtube"
    if re.search(r"tiktok\.com", url, re.I):
        return "tiktok"
    return "web"



def parse_json_safe(raw: str, fallback):
    try:
        cleaned = re.sub(r"```json\s?|```", "", raw).strip()
        # Coba ambil blok {...} pertama jika ada teks lain
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        return json.loads(cleaned)
    except Exception:
        return fallback



def parse_json_array_safe(raw: str, fallback):
    """Khusus untuk response yang diharapkan berupa array [...] bukan object {...}"""
    try:
        cleaned = re.sub(r"```json\s?|```", "", raw).strip()
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        return json.loads(cleaned)
    except Exception:
        return fallback



def extract_text_from_gemini(response) -> str:
    try:
        return response.text
    except Exception:
        texts = []
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "text") and part.text:
                    texts.append(part.text)
        return "\n".join(texts)

