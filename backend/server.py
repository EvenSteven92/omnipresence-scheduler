"""
TORCC OmniSocial backend.

Endpoints
- GET  /api/health                  health probe
- POST /api/ai/generate             generate marketing copy via Emergent LLM (Claude Sonnet 4.5)
- GET  /api/news/headlines          aggregated world/US news headlines (RSS-backed)
"""
import asyncio
import html as html_module
import os
import time
import uuid
from typing import Literal, Optional

import feedparser
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    LlmChat = None  # type: ignore[misc, assignment]
    UserMessage = None  # type: ignore[misc, assignment]
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI(title="TORCC OmniSocial API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "llm_configured": bool(EMERGENT_LLM_KEY)}


# ─── AI generation ──────────────────────────────────────────────────────────

Kind = Literal["caption", "hashtags", "yt_desc", "yt_title", "internal_notes"]

PROMPTS: dict[str, str] = {
    "caption": (
        "You write punchy, on-brand social-media captions for a multi-platform creator. "
        "Output ONLY the caption text — no preamble, no quotes, no markdown headers. "
        "Use line breaks for rhythm. Keep it within 1100 characters unless asked otherwise. "
        "If platforms include X (Twitter), keep the FIRST line under 240 chars so it can be reused there."
    ),
    "hashtags": (
        "You generate social-media hashtag blocks optimised per platform. "
        "Output ONLY a single line of space-separated hashtags (no commas, no quotes, no preamble). "
        "Target ~12 hashtags total. Mix branded, niche, and trending. Lowercase unless brand demands otherwise."
    ),
    "yt_desc": (
        "You write SEO-optimised YouTube descriptions. "
        "Output a 3-paragraph description: (1) hook + summary, (2) what viewers will learn / takeaways with bullets, (3) CTA + socials. "
        "Plain text only, no markdown headers. ~150-220 words."
    ),
    "yt_title": (
        "You write punchy YouTube titles (max 70 chars) that earn clicks without clickbait. "
        "Output ONLY the title — no quotes, no numbering, no markdown. One line."
    ),
    "internal_notes": (
        "You summarise post intent for an internal social team. "
        "Output 3-5 short bullet points (use '- '): goal, primary platform, success metric, any caveats. "
        "Plain text only."
    ),
}


class GenerateRequest(BaseModel):
    kind: Kind
    brief: str = Field(..., min_length=1, max_length=10000, description="Short description / transcript / context")
    tone: Optional[str] = Field(default=None, description="e.g. casual, devotional, hype, formal")
    platforms: Optional[list[str]] = Field(default=None, description="Target platforms: X, FB, IG, YT, RUMBLE, TIKTOK, IG STORY, FB STORY, YT SHORTS")
    title: Optional[str] = Field(default=None, description="Optional post title for additional context")


class GenerateResponse(BaseModel):
    kind: Kind
    text: str


@app.post("/api/ai/generate", response_model=GenerateResponse)
async def ai_generate(req: GenerateRequest):
    if LlmChat is None or UserMessage is None:
        raise HTTPException(
            status_code=503,
            detail="emergentintegrations not installed (AI copy generation unavailable locally)",
        )
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="EMERGENT_LLM_KEY not configured on server")

    system_message = PROMPTS[req.kind]

    parts: list[str] = []
    if req.title:
        parts.append(f"Post title: {req.title}")
    if req.platforms:
        parts.append(f"Target platforms: {', '.join(req.platforms)}")
    if req.tone:
        parts.append(f"Tone: {req.tone}")
    parts.append("Brief / transcript:\n" + req.brief.strip())

    user_text = "\n\n".join(parts)

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"torcc-{req.kind}-{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-haiku-4-5-20251001")

        text = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:  # noqa: BLE001 — bubble a clean error to the client
        raise HTTPException(status_code=502, detail=f"LLM call failed: {exc}") from exc

    return GenerateResponse(kind=req.kind, text=text.strip())

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

