import asyncio
import os
import re
import tempfile
import time
import uuid
from typing import Optional
import httpx
import yt_dlp
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from google.genai import types
from ..core.config import genai_client
from ..core.ai import call_gemini_with_retry, gemini_generate, extract_text_from_gemini

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
    try:
        print(f"[upload_audio] Uploading {file_path}...")
        audio_file = genai_client.files.upload(
            file=file_path,
            config=types.UploadFileConfig(
                mime_type="audio/mpeg",
                display_name=os.path.basename(file_path),
            ),
        )
        max_wait, waited = 60, 0
        while audio_file.state == types.FileState.PROCESSING and waited < max_wait:
            print(f"[upload_audio] Waiting... ({waited}s)")
            time.sleep(2)
            waited += 2
            audio_file = genai_client.files.get(name=audio_file.name)

        if audio_file.state == types.FileState.FAILED:
            print("[upload_audio] File processing failed")
            return None

        print(f"[upload_audio] Upload successful: {audio_file.name}")
        return audio_file
    except Exception as e:
        print(f"Error uploading audio: {e}")
        return None



def transcribe_with_gemini(audio_file_obj: object, platform: str) -> str:
    """
    Transkrip audio via Gemini.
    ✅ call_gemini_with_retry — titik 1
    """
    prompt = (
        "Transkrip seluruh isi audio berikut ke dalam teks bahasa Indonesia. "
        "Jika audio dalam bahasa lain, transkrip apa adanya lalu tambahkan terjemahan "
        "Indonesia di bawahnya.\n\n"
        "Format:\nTRANSKRIP ASLI:\n[isi]\n\nTERJEMAHAN (jika bukan Bahasa Indonesia):\n[terjemahan]"
    )
    try:
        response = call_gemini_with_retry(
            lambda: gemini_generate([audio_file_obj, prompt], use_web_search=False),
            max_retries=4,
            base_delay=5.0,  # mulai 5s karena audio besar lebih lambat recover
        )
        return extract_text_from_gemini(response)
    except Exception as e:
        print(f"Error transcribing audio (semua retry habis): {e}")
        return ""  # Transkrip kosong → pipeline tetap lanjut pakai metadata



def cleanup_files(local_path: Optional[str], gemini_file_obj=None):
    if local_path and os.path.exists(local_path):
        try:
            os.remove(local_path)
            print(f"Deleted local file: {local_path}")
        except Exception:
            pass
    if gemini_file_obj:
        try:
            genai_client.files.delete(name=gemini_file_obj.name)
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
            print("[transcript] Menggunakan subtitle YouTube")

    if not transcript:
        print(f"[transcript] Tidak ada subtitle, download audio dari {platform}...")
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
                        # transcribe_with_gemini sudah punya retry di dalamnya
                        transcript = await loop.run_in_executor(
                            None, transcribe_with_gemini, gemini_file, platform
                        )
                        print(f"[transcript] Berhasil, {len(transcript)} karakter")
                    else:
                        transcript = "(Gagal upload audio ke Gemini)"
                else:
                    transcript = f"(File audio terlalu besar: {file_size_mb:.1f}MB > 25MB)"
            else:
                transcript = "(Gagal download audio)"
        finally:
            cleanup_files(audio_path, gemini_file)

    meta["transcript"] = transcript
    return meta

