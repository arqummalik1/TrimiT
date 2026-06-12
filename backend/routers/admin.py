"""
Admin router — broadcast push notifications and audit log.

Auth: static bearer token from settings.ADMIN_API_TOKEN. Disabled (404) if
the token is not configured. This is intentional for v1 — when the project
introduces a real admin role table, swap _require_admin for a JWT-based check.
"""

from __future__ import annotations

import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from config import settings
from core.limiter import limiter
from services.broadcast import (
    VALID_AUDIENCES,
    list_recent_broadcasts,
    send_broadcast,
)
from services import subscription_service as subs

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(authorization: Optional[str]) -> None:
    if not settings.ADMIN_API_TOKEN:
        # Don't reveal that the endpoint exists if admin auth isn't configured.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "ADMIN_AUTH_REQUIRED", "message": "Bearer token required"},
        )
    presented = authorization.split(" ", 1)[1].strip()
    if not hmac.compare_digest(presented, settings.ADMIN_API_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ADMIN_AUTH_INVALID", "message": "Invalid admin token"},
        )


class BroadcastCreate(BaseModel):
    audience: str = Field(..., description="customers | owners | all")
    title: str = Field(..., min_length=1, max_length=80)
    body: str = Field(..., min_length=1, max_length=240)
    # Optional structured payload forwarded to Expo as `data`. Reserved keys
    # ('type', 'audience') are overridden server-side.
    data: Optional[dict] = None


@router.post("/broadcast", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("10/minute")
async def create_broadcast(
    request: Request,
    payload: BroadcastCreate,
    authorization: Optional[str] = Header(None),
):
    _require_admin(authorization)

    if payload.audience not in VALID_AUDIENCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_AUDIENCE",
                "message": f"audience must be one of {list(VALID_AUDIENCES)}",
            },
        )

    try:
        result = await send_broadcast(
            audience=payload.audience,
            title=payload.title,
            body=payload.body,
            data=payload.data,
            # We don't yet have a per-admin user identity, so created_by is
            # left null. When admin auth becomes JWT-based, populate this.
            created_by=None,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_BROADCAST", "message": str(exc)},
        ) from exc
    except Exception as exc:
        logger.exception("[Admin] broadcast failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "BROADCAST_FAILED",
                "message": "Could not send broadcast",
            },
        ) from exc

    return result


@router.get("/broadcast")
@limiter.limit("30/minute")
async def list_broadcasts(
    request: Request,
    limit: int = 50,
    authorization: Optional[str] = Header(None),
):
    _require_admin(authorization)
    return await list_recent_broadcasts(limit=limit)


@router.get("/subscriptions/analytics")
@limiter.limit("30/minute")
async def subscription_analytics(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Subscriber counts, MRR/ARR, revenue, status breakdown."""
    _require_admin(authorization)
    return await subs.admin_analytics()
