"""Compatibility entry point for the standalone TikTok scraper."""
try:
    from .app.services.tiktok_scraper import scrape_tiktok_comments
except ImportError:
    from app.services.tiktok_scraper import scrape_tiktok_comments

if __name__ == "__main__":
    import asyncio
    url_test = "https://www.tiktok.com/@saptxc._/video/7602971738766396693?is_from_webapp=1&sender_device=pc"
    result = asyncio.run(scrape_tiktok_comments(url_test, target_count=20))
    print("\n=== Result Comment ===")
    for i, komen in enumerate(result[:20], 1):
        print(f"{i}. {komen}")
