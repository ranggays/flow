import asyncio
import itertools
import random
import traceback
import httpx
from fastapi import APIRouter, HTTPException
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from youtube_comment_downloader import *
from ...models.schemas import YoutubeCommentRequest, TiktokCommentRequest
from ...core.config import COLAB_ML_URL
from ...core.ai import call_gemini_with_retry, gemini_generate

router = APIRouter()

@router.post("/api/social-listening/youtube")
async def analyze_youtube_comments(req: YoutubeCommentRequest):
    try:
        import urllib.parse as urlparse
        url_data = urlparse.urlparse(req.url)
        query = urlparse.parse_qs(url_data.query)
        video_id = query.get("v", [None])[0]

        if not video_id:
            video_id = url_data.path.split("/")[-1]

        if not video_id:
            raise HTTPException(status_code=400, detail="URL Youtube isnot valid")

        print(f"Get comment for video: {video_id}...")
        downloader = YoutubeCommentDownloader()
        comments_generator = downloader.get_comments(video_id, sort_by=SORT_BY_POPULAR)

        comment_list = []
        for comment in itertools.islice(comments_generator, 200):
            text = comment.get("text", "").strip()
            if text:
                comment_list.append(text)
        
        if not comment_list:
            raise HTTPException(status_code=404, detail="There is no comment")
        
        print(f"Success get {len(comment_list)} comment. Send to the colab...")

        async with httpx.AsyncClient(timeout=260.0) as client:
            response = await client.post(
                COLAB_ML_URL,
                json={"comments": comment_list},
                headers={"ngrok-skip-browser-warning": "69420"}
            )

            print("=========================================")
            print(f"STATUS CODE: {response.status_code}")
            print(f"ISI BALASAN NGROK:\n{response.text}") # Cetak 500 huruf pertamanya
            print("=========================================")

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="failed connect server colab")
            
            ml_result = response.json()

            return ml_result

    except Exception as e:
        print(f"error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/api/social-listening/tiktok")
async def analyze_tiktok_comments(req: TiktokCommentRequest):
    try:
        video_url = req.url
        print(f"Extracting video: {video_url}")

        target_count = 200

        # 🛠️ ISOLASI PLAYWRIGHT KE DALAM FUNGSI SINKRON
        def run_playwright_scraper():
            import asyncio
            import sys
            
            # 1. Paksa penggunaan Proactor HANYA untuk thread terpisah ini
            if sys.platform == 'win32':
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

            # 2. Fungsi async murni milik Playwright
            async def _scrape():
                comments_collected = []
                async with Stealth().use_async(async_playwright()) as p:
                    # Headless di-set True karena ini untuk backend
                    browser = await p.chromium.launch(headless=True, slow_mo=50)
                    context = await browser.new_context(
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    )
                    page = await context.new_page()

                    try:
                        await page.goto(video_url, timeout=60000)
                        await page.wait_for_load_state("domcontentloaded")
                        await page.wait_for_timeout(15000)

                        slider_button = '.secsdk-captcha-drag-icon'
                        try:
                            await page.wait_for_selector(slider_button, timeout=3000)
                            print("Captcha detected!")
                            slider = await page.query_selector(slider_button)
                            if slider:
                                box = await slider.bounding_box()
                                if box:
                                    start_x = box["x"] + box["width"] / 2
                                    start_y = box["y"] + box["height"] / 2
                                    await page.mouse.move(start_x, start_y)
                                    await page.mouse.down()
                                    target_x = start_x + random.uniform(150, 180)
                                    await page.mouse.move(target_x, start_y, steps=20)
                                    await page.mouse.move(target_x + 5, start_y + random.uniform(2, 2), steps=5)
                                    await page.mouse.move(target_x - 5, start_y, steps=5)
                                    await page.mouse.up()
                                    await page.wait_for_timeout(4000)
                        except Exception:
                            pass

                        icon_selector = '[data-e2e="comment-icon"]'
                        try:
                            await page.wait_for_selector(icon_selector, timeout=10000)
                            await page.click(icon_selector)
                            await page.wait_for_timeout(3000)
                        except Exception:
                            print("Comment icon is not found")

                        scroll_attemps = 0
                        max_scrolls = (target_count // 10) + 35
                        comment_text_selector = '[data-e2e="comment-level-1"]'

                        while len(comments_collected) < target_count and scroll_attemps < max_scrolls:
                            scroll_attemps += 1
                            elements = await page.query_selector_all(comment_text_selector)

                            if not elements:
                                break

                            for el in elements:
                                text = await el.text_content()
                                if text:
                                    clean_text = text.strip()
                                    if len(clean_text) > 0 and clean_text not in comments_collected:
                                        comments_collected.append(clean_text)

                            print(f"   📊 Sedang Scroll ke-{scroll_attemps}... Terkumpul: {len(comments_collected)} komentar")

                            if len(comments_collected) >= target_count:
                                break

                            try:
                                last_element = elements[-1]
                                await last_element.scroll_into_view_if_needed()
                                await last_element.hover()
                                await page.mouse.wheel(0, 2000)
                            except Exception:
                                pass

                            await page.wait_for_timeout(2000)

                    except Exception as scrape_error:
                        print(f"Scraping error: {scrape_error}")
                    finally:
                        await browser.close()

                    return comments_collected

            # 3. Jalankan event loop baru yang sudah kebal dari Uvicorn
            return asyncio.run(_scrape())

        # 🛠️ JALANKAN PROSESNYA DI THREAD BACKGROUND 
        # (Uvicorn tetap bernapas lega, Playwright jalan di ruang tertutup)
        comments_collected = await asyncio.to_thread(run_playwright_scraper)

        if not comments_collected:
            raise HTTPException(status_code=404, detail="There are no comments successfully extracted")
        
        print(f"Successfully get {len(comments_collected)} comments. Send to Colab ML...")

        async with httpx.AsyncClient(timeout=120.0) as client:
            colab_response = await client.post(
                COLAB_ML_URL, # Pastikan variabel ini sudah terisi Ngrok terbaru di atas file Anda
                json={"comments": comments_collected},
                headers={"ngrok-skip-browser-warning": "69420"},
            )
            if colab_response.status_code != 200:
                print(f"Error ML Colab: {colab_response.text}")
                raise HTTPException(status_code=colab_response.status_code, detail="Failed connected to Colab Server")

            # Ekstrak hasil dari Colab
            colab_data = colab_response.json()
            if not colab_data.get("success"):
                raise HTTPException(status_code=500, detail="Colab gagal memproses sentimen.")
            
            sentiment_info = colab_data["data"]
            print("✅ Sentimen berhasil dihitung! Memulai proses Rangkuman dengan Gemini...")

            # --- TAHAP 2: PROSES SUMMARIZATION DENGAN GEMINI (MENGGUNAKAN FUNGSI ANDA) ---
            
            # Gabungkan komentar untuk dibaca Gemini (batasi panjangnya agar aman)
            combined_comments = "\n- ".join(comments_collected[:100])
            
            prompt_summary = f"""
Kamu adalah analis sosial media profesional. Tugasmu adalah membaca komentar netizen dan hasil analisis mesin, lalu buatkan 1 paragraf kesimpulan padat (maksimal 3-4 kalimat).
Jangan pernah mengarang informasi atau menyebut hal yang tidak ada kaitannya (hindari halusinasi).

Statistik Sentimen:
- Positif: {sentiment_info['sentiment_distribution']['positive']}
- Negatif: {sentiment_info['sentiment_distribution']['negative']}
- Netral: {sentiment_info['sentiment_distribution']['neutral']}

Beberapa contoh komentar asli:
{combined_comments[:3000]}

Buatlah paragraf kesimpulanmu sekarang, fokus pada alasan mengapa sentimen netizen dominan seperti statistik di atas:
"""
            
            try:
                # 🌟 KITA BUNGKUS PEMANGGILANNYA DENGAN LAMBDA & RETRY
                response = call_gemini_with_retry(
                    fn=lambda: gemini_generate(prompt=prompt_summary, use_web_search=False),
                    max_retries=4,
                    base_delay=3.0
                )
                ai_summary = response.text.strip()
                
            except Exception as e:
                print(f"⚠️ Gagal men-generate rangkuman dengan Gemini (setelah 4x percobaan): {e}")
                ai_summary = "Maaf, rangkuman gagal dihasilkan karena AI sedang sibuk (Overloaded)."

            # --- TAHAP 3: GABUNGKAN HASIL COLAB + GEMINI, LALU KIRIM KE FRONTEND ---
            sentiment_info["summary"] = ai_summary

            return {
                "success": True,
                "data": sentiment_info
            }

            # if response.status_code == 200:
            #     print("Sentimen & Sumarization result successfully received")
            #     return response.json()

            # else:
            #     print(f"Error ML Colab: {response.text}")
            #     raise HTTPException(status_code=response.status_code, detail="Failed connected to Colab Server")
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ML Colab responded")
    except HTTPException:
        raise
    except Exception as e:
        error_msg = traceback.format_exc()
        print("Error backend:", error_msg)
        raise HTTPException(status_code=500, detail=str(e))