"""
TORCC OmniSocial backend.

Endpoints
- GET  /api/health                  health probe
- POST /api/ai/generate             generate marketing copy via Emergent LLM (Claude Sonnet 4.5)
"""
import os
import uuid
from typing import Literal, Optional

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import FastAPI, HTTPException
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
    platforms: Optional[list[str]] = Field(default=None, description="Target platforms: X, FB, IG, YT, TIKTOK, IG STORY, FB STORY")
    title: Optional[str] = Field(default=None, description="Optional post title for additional context")


class GenerateResponse(BaseModel):
    kind: Kind
    text: str


@app.post("/api/ai/generate", response_model=GenerateResponse)
async def ai_generate(req: GenerateRequest):
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
