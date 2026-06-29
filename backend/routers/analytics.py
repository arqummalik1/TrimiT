"""Public, privacy-friendly page-view tracking for the web app.

The web app pings ``POST /analytics/pageview`` on navigation. We store only a
client-generated random session id (not identity), the path, and an optional
referrer — no PII. Rows feed the admin dashboard's visitor metrics. Rate-limited
and best-effort: a tracking failure never affects the user.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from core.limiter import limiter
from core.supabase import supabase

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class PageViewIn(BaseModel):
    path: str = Field(..., max_length=512)
    referrer: Optional[str] = Field(default=None, max_length=512)
    session_id: Optional[str] = Field(default=None, max_length=64)


@router.post("/pageview")
@limiter.limit("120/minute")
async def track_pageview(request: Request, data: PageViewIn):
    """Record a single page view. Always returns 200 (best-effort)."""
    try:
        await supabase.request(
            "POST",
            "rest/v1/page_views",
            service_role=True,
            json={
                "path": data.path[:512],
                "referrer": (data.referrer or None),
                "session_id": (data.session_id or None),
            },
        )
    except Exception as exc:  # never break the client over analytics
        logger.warning("[Analytics] pageview write failed: %s", exc)
    return {"status": "ok"}
