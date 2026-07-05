"""
Centralized subscription access control.

`require_active_subscription` is the ONLY place premium gating is enforced.
Do not scatter status checks across routers — depend on this instead.

Phase 1 (SUBSCRIPTION_ENFORCEMENT_ENABLED=false): no-op pass-through. Status is
tracked and surfaced to clients, but nothing is blocked, so old mobile builds
keep working.

Phase 2 (SUBSCRIPTION_ENFORCEMENT_ENABLED=true): owners without access get a
402 with a structured body the client renders as the "subscription required"
state. Employees inherit the salon owner's subscription. Customers are never blocked.
"""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, status

from config import settings
from core.supabase import supabase
from dependencies.auth import get_current_user
from services import subscription_service as subs

logger = logging.getLogger("trimit")


async def _subscription_subject_id(current_user: dict) -> str:
    """Owner id whose subscription gates salon management (owner or salon owner for employees)."""
    profile = current_user.get("profile") or {}
    role = profile.get("role")
    user_id = current_user.get("id")
    if role != "employee":
        return user_id

    from services.salon_access import fetch_employee_staff_row

    staff = await fetch_employee_staff_row(user_id)
    if not staff or not staff.get("salon_id"):
        raise HTTPException(
            status_code=403,
            detail={"code": "EMPLOYEE_NOT_LINKED", "message": "Staff account is not linked to a salon."},
        )
    resp = await supabase.request(
        "GET",
        f"rest/v1/salons?id=eq.{staff['salon_id']}&select=owner_id",
        service_role=True,
    )
    if resp.status_code != 200 or not resp.json():
        raise HTTPException(status_code=404, detail="Salon not found")
    return resp.json()[0]["owner_id"]


async def require_active_subscription(current_user: dict = Depends(get_current_user)) -> dict:
    profile = current_user.get("profile") or {}
    role = profile.get("role")
    if role not in ("owner", "employee"):
        return current_user

    if not settings.SUBSCRIPTION_ENFORCEMENT_ENABLED:
        return current_user

    try:
        subject_id = await _subscription_subject_id(current_user)
        has_access = await subs.has_active_access(subject_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[Sub] access check failed user=%s err=%s — allowing", current_user.get("id"), e)
        return current_user

    if not has_access:
        msg = (
            "This salon's TrimiT Pro subscription is inactive. Ask the owner to renew."
            if role == "employee"
            else "Your TrimiT Pro subscription is inactive. Subscribe to continue."
        )
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "SUBSCRIPTION_REQUIRED", "message": msg},
        )
    return current_user
