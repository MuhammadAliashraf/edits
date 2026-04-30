"""Instagram publishing via Make.com webhook."""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from ...auth_headers import USER_ID_HEADER, get_signed_user_id
from ...config import get_config
from ...database import get_db
from ...ai import generate_instagram_caption
from ...repositories.clip_repository import ClipRepository
from ...repositories.task_repository import TaskRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/instagram", tags=["instagram"])

MAX_CAPTION_LEN = 2200
MAX_HASHTAGS = 30


def _get_user_id(request: Request) -> str:
    config = get_config()
    if config.monetization_enabled:
        return get_signed_user_id(request, config)
    user_id = request.headers.get("user_id") or request.headers.get(USER_ID_HEADER)
    if not user_id:
        raise HTTPException(status_code=401, detail="User authentication required")
    return user_id


class PublishRequest(BaseModel):
    clip_id: str = Field(min_length=1, max_length=64)
    caption: Optional[str] = Field(default=None, max_length=MAX_CAPTION_LEN)

    @field_validator("caption")
    @classmethod
    def _validate_caption(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v.count("#") > MAX_HASHTAGS:
            raise ValueError(f"caption exceeds {MAX_HASHTAGS} hashtags")
        return v


@router.get("/make-status")
async def make_status():
    config = get_config()
    return {"enabled": bool(config.make_instagram_webhook_url)}


@router.post("/publish")
async def publish(
    body: PublishRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    user_id = _get_user_id(request)
    config = get_config()

    if not config.make_instagram_webhook_url:
        raise HTTPException(
            status_code=503,
            detail="Instagram publishing not configured (MAKE_INSTAGRAM_WEBHOOK_URL missing)",
        )

    clip = await ClipRepository.get_clip_by_id(db, body.clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    task = await TaskRepository.get_task_by_id(db, clip["task_id"])
    if not task or task.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this clip")

    public_url = f"{config.public_base_url}/clips/{clip['filename']}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                config.make_instagram_webhook_url,
                json={"video_url": public_url, "caption": body.caption or "", "clip_id": body.clip_id},
            )
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error("Make.com webhook returned error: %s", e)
        raise HTTPException(status_code=502, detail="Make.com webhook returned an error") from e
    except httpx.RequestError as e:
        logger.error("Failed to reach Make.com webhook: %s", e)
        raise HTTPException(status_code=502, detail="Could not reach Make.com webhook") from e

    return {"status": "sent", "video_url": public_url}


@router.get("/suggest-caption")
async def suggest_caption(
    clip_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _get_user_id(request)

    clip = await ClipRepository.get_clip_by_id(db, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    task = await TaskRepository.get_task_by_id(db, clip["task_id"])
    if not task or task.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this clip")

    transcript_text = clip.get("text") or ""
    if not transcript_text.strip():
        raise HTTPException(status_code=422, detail="Clip has no transcript text")

    try:
        suggestion = await generate_instagram_caption(
            transcript_text=transcript_text,
            hook_type=clip.get("hook_type"),
            reasoning=clip.get("reasoning"),
            virality_score=clip.get("virality_score"),
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    hashtag_str = " ".join(f"#{h.lstrip('#')}" for h in suggestion.hashtags)
    full_caption = f"{suggestion.caption}\n\n{hashtag_str}".strip()
    return {"caption": full_caption, "hashtags": suggestion.hashtags}
