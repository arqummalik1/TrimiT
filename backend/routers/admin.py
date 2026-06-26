"""
Admin router — broadcast push notifications and audit log.

Auth: static bearer token from settings.ADMIN_API_TOKEN. Disabled (404) if
the token is not configured. This is intentional for v1 — when the project
introduces a real admin role table, swap _require_admin for a JWT-based check.
"""

from __future__ import annotations

import hmac
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from config import settings
from core.limiter import limiter
from core.supabase import supabase
from services.broadcast import (
    VALID_AUDIENCES,
    list_recent_broadcasts,
    send_broadcast,
)
from services.commission import get_commission_percent
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


# ── Commission rate (Requirement 15: Admin-Configurable Commission Rate) ─────
#
# The platform commission percent is persisted in app_settings under the key
# 'commission_percent' and read at payment time by
# services.commission.get_commission_percent(). These endpoints are admin-only
# (same ADMIN_API_TOKEN guard as the rest of this router) and are never exposed
# to Customers or Salon_Owners (Req 15.4). Changes apply to future payments
# only — already-captured payments are never mutated here (Req 15.2).


class CommissionRateUpdate(BaseModel):
    # No Field constraints here: we validate the 0–100 range in the handler so
    # we can return a structured INVALID_COMMISSION_RATE (400) rather than a
    # generic 422, per Requirement 15.3.
    commission_percent: float = Field(
        ..., description="Platform commission percent, 0–100 inclusive"
    )


@router.get("/commission-rate")
@limiter.limit("30/minute")
async def get_commission_rate(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Return the current platform commission percent (Req 15.1, 15.5)."""
    _require_admin(authorization)
    percent = await get_commission_percent()
    return {"commission_percent": percent}


@router.put("/commission-rate")
@limiter.limit("10/minute")
async def set_commission_rate(
    request: Request,
    payload: CommissionRateUpdate,
    authorization: Optional[str] = Header(None),
):
    """Set the platform commission percent (Req 15.2, 15.3, 15.4).

    Validates ``0 <= value <= 100``; otherwise rejects with a structured
    INVALID_COMMISSION_RATE error and leaves the stored value unchanged.
    Persists the value (as a string) into ``app_settings`` under the key
    ``commission_percent`` via the Supabase service role.
    """
    _require_admin(authorization)

    value = payload.commission_percent
    if value < 0 or value > 100:
        # Reject without touching the stored value (Req 15.3).
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_COMMISSION_RATE",
                "message": "commission_percent must be between 0 and 100 inclusive",
            },
        )

    now = datetime.now(timezone.utc).isoformat()
    row = {"key": "commission_percent", "value": str(value), "updated_at": now}

    try:
        # Upsert one row keyed by 'commission_percent': update in place if it
        # exists (it is seeded by migration 48), else insert. Mirrors the
        # GET-then-PATCH/POST pattern used elsewhere in the codebase.
        existing = await supabase.request(
            "GET",
            "rest/v1/app_settings?key=eq.commission_percent&select=key",
            service_role=True,
        )
        has_row = existing.status_code == 200 and bool(existing.json())

        if has_row:
            response = await supabase.request(
                "PATCH",
                "rest/v1/app_settings?key=eq.commission_percent",
                service_role=True,
                json={"value": str(value), "updated_at": now},
            )
        else:
            response = await supabase.request(
                "POST",
                "rest/v1/app_settings",
                service_role=True,
                json=row,
            )

        if response.status_code not in (200, 201, 204):
            raise RuntimeError(
                f"app_settings upsert returned {response.status_code}"
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[Admin] commission-rate update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "COMMISSION_RATE_UPDATE_FAILED",
                "message": "Could not update commission rate",
            },
        ) from exc

    return {"commission_percent": value}
