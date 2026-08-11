"""
TORCC OmniPresence optional local backend (news ticker only).

Endpoints
- GET  /api/health                  health probe
- GET  /api/news/headlines          aggregated world/US news headlines (RSS-backed)

AI copy lives on the TanStack app (`POST /api/ai/generate` in frontend) — not here.
"""
import asyncio
import html as html_module
import time

import feedparser
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="TORCC OmniPresence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "local-news"}


# ─── News headlines (RSS) ───────────────────────────────────────────────────

_NEWS_FEEDS = [
    ("BBC", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC US/Canada", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml"),
    ("NPR", "https://feeds.npr.org/1004/rss.xml"),
    ("Reuters World", "https://www.reutersagency.com/feed/?best-topics=world&post_type=best"),
    ("AP Top", "https://rsshub.app/apnews/topics/apf-topnews"),
]

_NEWS_CACHE: dict[str, list[dict]] = {"items": []}
_NEWS_CACHE_AT: dict[str, float] = {"at": 0.0}
_NEWS_TTL_SECONDS = 5 * 60  # refresh every 5 min


def _strip_html(s: str) -> str:
    return html_module.unescape(s or "").strip()


def _fetch_feeds() -> list[dict]:
    items: list[dict] = []
    for source, url in _NEWS_FEEDS:
        try:
            feed = feedparser.parse(url)
        except Exception:  # noqa: BLE001
            continue
        for entry in feed.entries[:10]:
            title = _strip_html(getattr(entry, "title", ""))
            link = getattr(entry, "link", "")
            published = getattr(entry, "published", "") or getattr(entry, "updated", "")
            published_parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
            ts = int(time.mktime(published_parsed)) if published_parsed else 0
            if not title:
                continue
            items.append({
                "title": title,
                "link": link,
                "source": source,
                "published": published,
                "ts": ts,
            })
    # Sort newest first, dedupe by title
    seen: set[str] = set()
    unique: list[dict] = []
    for it in sorted(items, key=lambda x: x["ts"], reverse=True):
        key = it["title"].lower()[:120]
        if key in seen:
            continue
        seen.add(key)
        unique.append(it)
    return unique[:30]


@app.get("/api/news/headlines")
async def news_headlines():
    """Aggregated world / US headlines, refreshed every 5 minutes server-side."""
    now = time.time()
    if not _NEWS_CACHE["items"] or now - _NEWS_CACHE_AT["at"] > _NEWS_TTL_SECONDS:
        items = await asyncio.to_thread(_fetch_feeds)
        if items:
            _NEWS_CACHE["items"] = items
            _NEWS_CACHE_AT["at"] = now
    return {"items": _NEWS_CACHE["items"], "fetched_at": int(_NEWS_CACHE_AT["at"])}

