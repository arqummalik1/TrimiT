"""
Admin router — broadcast push notifications and audit log.

Auth: static bearer token from settings.ADMIN_API_TOKEN. Disabled (404) if
the token is not configured. This is intentional for v1 — when the project
introduces a real admin role table, swap _require_admin for a JWT-based check.
"""

from __future__ import annotations

import hmac
import logging
from datetime import datetime, timedelta, timezone
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
from services import subscription_service as subs
from services import admin_dashboard as dashboard
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


# ── Dashboard PIN login ───────────────────────────────────────────────────────
#
# The web admin page collects a 6–10 digit PIN and exchanges it here for the
# bearer token used by every other admin endpoint. The real token NEVER ships in
# client code — only the PIN does, and it's compared server-side in constant time
# and rate-limited hard to make brute force impractical.


class AdminLoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=32)


@router.post("/login")
@limiter.limit("5/minute")
async def admin_login(request: Request, payload: AdminLoginRequest):
    """Exchange the dashboard PIN for the admin bearer token."""
    if not settings.ADMIN_API_TOKEN or not settings.ADMIN_DASHBOARD_PIN:
        # Login disabled unless BOTH the token and the PIN are configured.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    if not hmac.compare_digest(payload.pin.strip(), settings.ADMIN_DASHBOARD_PIN.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_PIN", "message": "Incorrect PIN."},
        )
    return {"token": settings.ADMIN_API_TOKEN}


# ── Dashboard data ─────────────────────────────────────────────────────────────
@router.get("/dashboard/overview")
@limiter.limit("60/minute")
async def dashboard_overview(request: Request, authorization: Optional[str] = Header(None)):
    """Top-line counts, subscription breakdown, MRR/revenue, visitor stats."""
    _require_admin(authorization)
    return await dashboard.get_overview()


@router.get("/dashboard/owners")
@limiter.limit("60/minute")
async def dashboard_owners(request: Request, authorization: Optional[str] = Header(None)):
    """All salon owners with salon + subscription status + trial days left."""
    _require_admin(authorization)
    return {"owners": await dashboard.list_owners()}


@router.get("/dashboard/customers")
@limiter.limit("60/minute")
async def dashboard_customers(request: Request, authorization: Optional[str] = Header(None)):
    """All customers."""
    _require_admin(authorization)
    return {"customers": await dashboard.list_customers()}


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


# ── Manual subscription grant (escape hatch until in-app Razorpay is live) ────
#
# Lets an admin activate/extend a salon owner's subscription when they pay you
# offline (e.g. UPI/bank transfer). Admin-only (ADMIN_API_TOKEN). Sets the owner
# to `active` with a paid period of `days` (default 30); the subscription
# trigger flips their salon back to visible/bookable.


class GrantSubscriptionRequest(BaseModel):
    owner_id: str = Field(..., description="public.users.id of the salon owner")
    days: int = Field(default=30, ge=1, le=3660, description="Days of access to grant")


@router.post("/grant-subscription")
@limiter.limit("20/minute")
async def grant_subscription(
    request: Request,
    payload: GrantSubscriptionRequest,
    authorization: Optional[str] = Header(None),
):
    """Activate/extend an owner's subscription by N days (admin-only)."""
    _require_admin(authorization)

    # Make sure a subscription row exists for this owner.
    try:
        await subs.ensure_trial(payload.owner_id)
    except Exception as exc:
        logger.error("[Admin] grant ensure_trial failed owner=%s err=%s", payload.owner_id, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "OWNER_NOT_FOUND", "message": "No such owner or subscription."},
        )

    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=payload.days)
    updated = await subs.update_subscription(
        payload.owner_id,
        {
            "status": "active",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "next_renewal_at": period_end.isoformat(),
            "cancel_at_period_end": False,
            "cancelled_at": None,
        },
        event_type="admin_granted",
        source="admin",
        metadata={"days": payload.days},
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "GRANT_FAILED", "message": "Could not grant subscription."},
        )
    return {
        "status": "active",
        "owner_id": payload.owner_id,
        "current_period_end": period_end.isoformat(),
    }


# ── User Management (Block/Unblock/Delete/Invite) ──────────────────────────────

class BlockUserRequest(BaseModel):
    user_id: str = Field(..., description="public.users.id to block")


@router.post("/users/block")
@limiter.limit("30/minute")
async def block_user(
    request: Request,
    payload: BlockUserRequest,
    authorization: Optional[str] = Header(None),
):
    """Block a user from accessing the app."""
    _require_admin(authorization)
    try:
        await supabase.request(
            "PATCH",
            f"rest/v1/users?id=eq.{payload.user_id}",
            service_role=True,
            json={"is_blocked": True},
        )
        return {"status": "blocked", "user_id": payload.user_id}
    except Exception as exc:
        logger.error("[Admin] block user failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "BLOCK_FAILED", "message": "Could not block user."},
        )


@router.post("/users/unblock")
@limiter.limit("30/minute")
async def unblock_user(
    request: Request,
    payload: BlockUserRequest,
    authorization: Optional[str] = Header(None),
):
    """Unblock a user."""
    _require_admin(authorization)
    try:
        await supabase.request(
            "PATCH",
            f"rest/v1/users?id=eq.{payload.user_id}",
            service_role=True,
            json={"is_blocked": False},
        )
        return {"status": "unblocked", "user_id": payload.user_id}
    except Exception as exc:
        logger.error("[Admin] unblock user failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "UNBLOCK_FAILED", "message": "Could not unblock user."},
        )


@router.delete("/users/{user_id}")
@limiter.limit("10/minute")
async def delete_user(
    request: Request,
    user_id: str,
    authorization: Optional[str] = Header(None),
):
    """Delete a user (soft delete by setting deleted_at)."""
    _require_admin(authorization)
    try:
        await supabase.request(
            "PATCH",
            f"rest/v1/users?id=eq.{user_id}",
            service_role=True,
            json={"deleted_at": datetime.now(timezone.utc).isoformat()},
        )
        return {"status": "deleted", "user_id": user_id}
    except Exception as exc:
        logger.error("[Admin] delete user failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "DELETE_FAILED", "message": "Could not delete user."},
        )


class InviteUserRequest(BaseModel):
    email: str = Field(..., description="Email to invite")
    name: Optional[str] = Field(None, description="Optional name")
    role: str = Field(default="customer", description="customer or owner")


@router.post("/users/invite")
@limiter.limit("10/minute")
async def invite_user(
    request: Request,
    payload: InviteUserRequest,
    authorization: Optional[str] = Header(None),
):
    """Send an invitation email to a new user."""
    _require_admin(authorization)
    # In v1, this just returns success - actual email sending would need Resend integration
    # For now, you can manually reach out or implement Resend invite emails later
    return {
        "status": "invited",
        "email": payload.email,
        "role": payload.role,
        "message": f"Invitation prepared for {payload.email}. Contact them manually or implement email sending.",
    }
