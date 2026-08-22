"""Salon access control — owners and linked staff employees."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from core.supabase import supabase

_PHONE_DIGITS = re.compile(r"\D")


def normalize_phone_digits(phone: Optional[str]) -> str:
    """Last 10 digits for Indian mobile matching."""
    if not phone:
        return ""
    digits = _PHONE_DIGITS.sub("", phone.strip())
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def is_salon_manager_role(role: Optional[str]) -> bool:
    return role in ("owner", "employee")


async def fetch_employee_staff_row(user_id: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        "rest/v1/staff"
        f"?user_id=eq.{user_id}"
        "&app_access_status=eq.active"
        "&is_active=eq.true"
        "&select=id,salon_id,name,user_id,app_access_status",
        service_role=True,
    )
    if resp.status_code != 200 or not resp.json():
        return None
    return resp.json()[0]


async def get_managed_salon_ids(user_id: str, role: str) -> List[str]:
    if role == "owner":
        resp = await supabase.request(
            "GET",
            f"rest/v1/salons?owner_id=eq.{user_id}&select=id",
            service_role=True,
        )
        if resp.status_code != 200:
            return []
        return [row["id"] for row in (resp.json() or []) if row.get("id")]

    if role == "employee":
        staff = await fetch_employee_staff_row(user_id)
        if staff and staff.get("salon_id"):
            return [staff["salon_id"]]
    return []


async def user_can_manage_salon(user_id: str, role: str, salon_id: str) -> bool:
    salon_ids = await get_managed_salon_ids(user_id, role)
    return salon_id in salon_ids


async def assert_salon_manager(salon_id: str, user_id: str, role: str) -> None:
    if not await user_can_manage_salon(user_id, role, salon_id):
        raise HTTPException(status_code=403, detail="Unauthorized")


async def get_primary_salon_for_manager(
    user_id: str,
    role: str,
    *,
    token: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Salon dict for owner or linked employee (owner dashboard).

    Always uses service_role so bank columns remain readable for the owner
    path after column-level REVOKE from authenticated. Callers must strip
    bank fields before returning to employees / clients if needed.
    """
    _ = token  # retained for call-site compatibility; never used for salon fetch
    if role == "owner":
        resp = await supabase.request(
            "GET",
            f"rest/v1/salons?owner_id=eq.{user_id}&select=*",
            service_role=True,
        )
        if resp.status_code == 200 and resp.json():
            return resp.json()[0]
        return None

    if role == "employee":
        staff = await fetch_employee_staff_row(user_id)
        if not staff or not staff.get("salon_id"):
            return None
        resp = await supabase.request(
            "GET",
            f"rest/v1/salons?id=eq.{staff['salon_id']}&select=*",
            service_role=True,
        )
        if resp.status_code == 200 and resp.json():
            salon = resp.json()[0]
            # Employees must never see payout fields.
            for key in (
                "bank_account_number",
                "bank_ifsc",
                "bank_account_holder_name",
                "bank_name",
                "account_holder_name",
            ):
                salon.pop(key, None)
            salon["_employee_staff_id"] = staff.get("id")
            salon["_employee_staff_name"] = staff.get("name")
            return salon
    return None


async def link_employee_from_pending_invite(
    user_id: str,
    phone: Optional[str],
    email: Optional[str],
) -> Optional[str]:
    """
    Atomically claim a pending staff invite by phone (preferred) or email.

    Uses SECURITY DEFINER RPC claim_staff_invite so only one claimant wins
    (FOR UPDATE SKIP LOCKED + user_id IS NULL). Prefer verified JWT email when
    present; phone digits are last-10 match against the invite row.
    """
    phone_digits = normalize_phone_digits(phone) or None
    email_norm = (email or "").strip().lower() or None
    if not phone_digits and not email_norm:
        return None

    resp = await supabase.request(
        "POST",
        "rest/v1/rpc/claim_staff_invite",
        json={
            "p_user_id": user_id,
            "p_phone_digits": phone_digits,
            "p_email": email_norm,
        },
        service_role=True,
    )
    if resp.status_code != 200:
        return None
    body = resp.json()
    if isinstance(body, str) and body:
        return body
    if isinstance(body, dict) and body.get("claim_staff_invite"):
        return body["claim_staff_invite"]
    return body if body else None
