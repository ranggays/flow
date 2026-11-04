import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth # 👈 Import versi terbaru
import random

async def scrape_tiktok_comments(video_url: str, target_count: int):
    print("🚀 Start playwright...")
    
    # 🌟 CARA BARU: Bungkus async_playwright dengan Stealth() agar 100% gaib!
    async with Stealth().use_async(async_playwright()) as p:

        # headless=False agar Anda bisa melihat prosesnya saat uji coba
        browser = await p.chromium.launch(headless=False, slow_mo=50)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        page = await context.new_page()

        try:
            print(f"🌐 Visit site: {video_url}")
            await page.goto(video_url, timeout=60000)
            
            print("⏳ Wait to stabilize...")
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(3000)

            # --- FASE 3.5: PROTOKOL PEMBUNUH SLIDER CAPTCHA ---
            print("🕵️ Cek jebakan Captcha Slider...")
            slider_button = '.secsdk-captcha-drag-icon' 
            
            try:
                # Menunggu maksimal 3 detik apakah Captcha muncul
                await page.wait_for_selector(slider_button, timeout=3000)
                print("⚠️ Captcha terdeteksi! Memulai blind-slide...")
                
                slider = await page.query_selector(slider_button)
                if slider:
                    box = await slider.bounding_box()
                    if box:
                        start_x = box["x"] + box["width"] / 2
                        start_y = box["y"] + box["height"] / 2
                        
                        await page.mouse.move(start_x, start_y)
                        await page.mouse.down()
                        
                        print("   Menggeser slider secara perlahan...")
                        # Geser sejauh 150-180 pixel secara acak
                        target_x = start_x + random.uniform(150, 180)
                        await page.mouse.move(target_x, start_y, steps=20) 
                        
                        # Efek getaran tangan manusia di akhir
                        await page.mouse.move(target_x + 5, start_y + random.uniform(-2, 2), steps=5)
                        await page.mouse.move(target_x - 5, start_y, steps=5)
                        
                        await page.mouse.up()
                        print("   Slider dilepas. Menunggu konfirmasi...")
                        await page.wait_for_timeout(4000)
            except Exception:
                print("✅ Aman, tidak ada Captcha terdeteksi.")

            # --- FASE 4: MEMBUKA LACI KOMENTAR ---
            print("🔍 Search comment area...")
            icon_selector = '[data-e2e="comment-icon"]'

            try:
                await page.wait_for_selector(icon_selector, timeout=10000)
                await page.click(icon_selector) # KLIK IKONNYA!
                print("✅ Comment icon clicked! Menunggu laci terbuka...")
                await page.wait_for_timeout(3000) 
            except Exception:
                print("⚠️ Comment icon not found.")
                await page.screenshot(path="debug_fase4_buntu.png")
                raise Exception("Gagal mengeklik ikon komentar.")
            
            # --- FASE 5: SCROLL DAN EKSTRAK ---
            print("🔄 Scrolling comment...")
            comments_collected = []
            scroll_attempts = 0
            max_scrolls = 15

            # Selector TEKS, bukan tombol
            comment_text_selector = '[data-e2e="comment-level-1"]'

            while len(comments_collected) < target_count and scroll_attempts < max_scrolls:
                scroll_attempts += 1
                
                elements = await page.query_selector_all(comment_text_selector)

                if not elements:
                    print("   ⚠️ Tidak ada teks komentar di layar.")
                    break

                # Ekstrak Teks
                for el in elements:
                    text = await el.text_content()
                    if text:
                        clean_text = text.strip()
                        if len(clean_text) > 0:
                            comments_collected.append(clean_text)

                print(f"   📊 Scroll {scroll_attempts} | Terkumpul: {len(comments_collected)} comment.")

                if len(comments_collected) >= target_count:
                    break

                # Trik Memaksa Scroll
                try:
                    last_element = elements[-1]
                    await last_element.scroll_into_view_if_needed()
                    await last_element.hover()
                    await page.mouse.wheel(0, 2000) 
                except Exception as e:
                    print(f"   ⚠️ Gagal scroll ke elemen terakhir: {e}")
                
                await page.wait_for_timeout(2000)
            
            print(f"\n🎉 Success get total {len(comments_collected)} comment!")
            return comments_collected
        
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            try:
                await page.screenshot(path="debug_fatal_error.png")
                print("📸 Pic evidence tersimpan.")
            except:
                pass
            raise e
        
        finally:
            print("🧹 Close browser")
            await browser.close()

if __name__ == "__main__":
    url_test = "https://www.tiktok.com/@saptxc._/video/7602971738766396693?is_from_webapp=1&sender_device=pc"

    # Jalan!
    result = asyncio.run(scrape_tiktok_comments(url_test, target_count=20))

    print("\n=== Result Comment ===")
    for i, komen in enumerate(result[:20], 1):
        print(f"{i}. {komen}")