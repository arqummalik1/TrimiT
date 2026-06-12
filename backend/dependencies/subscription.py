"""
Centralized subscription access control.

`require_active_subscription` is the ONLY place premium gating is enforced.
Do not scatter status checks across routers — depend on this instead.

Phase 1 (SUBSCRIPTION_ENFORCEMENT_ENABLED=false): no-op pass-through. Status is
tracked and surfaced to clients, but nothing is blocked, so old mobile builds
keep working.

Phase 2 (SUBSCRIPTION_ENFORCEMENT_ENABLED=true): owners without access get a
402 with a structured body the client renders as the "subscription required"
state. Customers/non-owners are never blocked.
"""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, status

from config import settings
from dependencies.auth import get_current_user
from services import subscription_service as subs

logger = logging.getLogger("trimit")


async def require_active_subscription(current_user: dict = Depends(get_current_user)) -> dict:
    # Only owners are subject to subscription gating.
    profile = current_user.get("profile") or {}
    role = profile.get("role")
    if role != "owner":
        return current_user

    if not settings.SUBSCRIPTION_ENFORCEMENT_ENABLED:
        # Phase 1: observe-only. Never block.
        return current_user

    owner_id = current_user.get("id")
    try:
        has_access = await subs.has_active_access(owner_id)
    except Exception as e:
        # Fail OPEN on infra errors — never lock an owner out because the
        # subscription lookup hiccuped. (RULES 2.2: don't break auth/booking
        # on transient errors.)
        logger.error("[Sub] access check failed owner=%s err=%s — allowing", owner_id, e)
        return current_user

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "SUBSCRIPTION_REQUIRED",
                "message": "Your TrimiT Pro subscription is inactive. Subscribe to continue.",
            },
        )
    return current_user
