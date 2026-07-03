"""
Serviceability router — public endpoints for city coverage + waitlist.

  GET  /serviceability/check?lat=&lng=   → is this point in a city we serve?
  POST /serviceability/waitlist          → out-of-area user asks to be notified.

Both are PUBLIC (no auth) — discovery must work for fresh installs before login.
The check endpoint fails open (returns serviceable=true) on any internal error so
a transient blip never locks real users out of the app.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status

from core.limiter import limiter
from models.serviceability import WaitlistJoin
from services import serviceability as svc

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/serviceability", tags=["Serviceability"])


@router.get("/check")
@limiter.limit("60/minute")
async def check(request: Request, lat: Optional[float] = None, lng: Optional[float] = None):
    """Return whether the given coordinates fall inside an active service area."""
    return await svc.check_serviceability(lat, lng)


@router.post("/waitlist", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def join_waitlist(request: Request, data: WaitlistJoin):
    """Capture an out-of-area user as a demand lead + send a confirmation email."""
    status_code, body = await svc.add_waitlist_lead(
        email=str(data.email),
        name=data.name,
        lat=data.lat,
        lng=data.lng,
        area_label=data.area_label,
        source=data.source,
    )
    if status_code != 201:
        raise HTTPException(
            status_code=status_code,
            detail={"code": body.get("code", "WAITLIST_FAILED"), "message": body.get("message", "Request failed")},
        )
    return body
