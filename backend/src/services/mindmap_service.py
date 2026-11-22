import re
import json
from src.schemas import MindmapRequest
from src.core import llm

async def generate_mindmap_api(request: MindmapRequest):
    try:
        prompt = f"""
        Anda adalah asisten ahli yang bertugas membuat struktur mindmap. Baca ringkasan teks berikut dan ekstrak SATU konsep utama (core_concept) serta maksimal 4-5 cabang utama (branches).

        SYARAT WAJIB:
        1. Jawaban HARUS berupa format JSON murni yang valid.
        2. TIDAK BOLEH ADA teks pengantar, penutup, atau format markdown (seperti ```json).
        3. Gunakan struktur persis seperti contoh di bawah ini.

        CONTOH FORMAT JSON:
        {{
            "core_concept": "Judul Utama (Maks 10 Kata)",
            "branches": [
                "Cabang 1 (Maks 10 kata)",
                "Cabang 2 (Maks 10 kata)"
            ]
        }}

        TEKS RINGKASAN:
        {request.summary}
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

        return {
            "status": "success",
            "data": mindmap_data
        }
    except Exception as e:
        raise RuntimeError(f"Failed creating mindmap structure, {e}") from e