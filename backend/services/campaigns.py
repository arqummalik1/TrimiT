"""Lane B — platform campaigns (welcome TRIMIT50, festival offers)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from core.supabase import supabase
from services.phone import normalize_india_phone

logger = logging.getLogger("trimit")


async def get_active_welcome_campaign() -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        "rest/v1/platform_campaigns?active=eq.true&campaign_type=eq.welcome&select=*&limit=1",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None


async def issue_welcome_grant(
    *,
    user_id: str,
    phone: str,
) -> Optional[Dict[str, Any]]:
    """Issue welcome voucher grant after customer profile creation. Idempotent."""
    phone_e164 = normalize_india_phone(phone)
    if not phone_e164:
        return None

    campaign = await get_active_welcome_campaign()
    if not campaign:
        return None

    campaign_id = campaign["id"]
    code = campaign["code"]

    existing = await supabase.request(
        "GET",
        f"rest/v1/campaign_grants?campaign_id=eq.{campaign_id}&user_id=eq.{user_id}&select=*",
        service_role=True,
    )
    if existing.status_code == 200 and existing.json():
        return existing.json()[0]

    phone_check = await supabase.request(
        "GET",
        f"rest/v1/campaign_grants?campaign_id=eq.{campaign_id}&phone_e164=eq.{phone_e164}&select=id",
        service_role=True,
    )
    if phone_check.status_code == 200 and phone_check.json():
        logger.info("welcome_grant: phone already used campaign=%s", code)
        return None

    validity_days = int(campaign.get("validity_days") or 10)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=validity_days)

    grant_data = {
        "campaign_id": campaign_id,
        "user_id": user_id,
        "phone_e164": phone_e164,
        "code": code,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    }

    resp = await supabase.request(
        "POST",
        "rest/v1/campaign_grants",
        service_role=True,
        json=grant_data,
    )
    if resp.status_code not in (200, 201):
        logger.error("welcome_grant insert failed: %s", resp.text)
        return None

    rows = resp.json()
    grant = rows[0] if isinstance(rows, list) and rows else rows
    logger.info("welcome_grant issued user=%s code=%s", user_id[:8], code)
    return grant


async def get_user_grants(user_id: str, *, active_only: bool = True) -> List[Dict[str, Any]]:
    query = (
        f"rest/v1/campaign_grants?user_id=eq.{user_id}"
        "&select=*,platform_campaigns(name,description,discount_type,discount_value,min_order_value)"
        "&order=issued_at.desc"
    )
    if active_only:
        now = datetime.now(timezone.utc).isoformat()
        query += f"&redeemed_at=is.null&expires_at=gt.{now}"

    resp = await supabase.request("GET", query, service_role=True)
    if resp.status_code != 200:
        return []
    return resp.json()


async def validate_campaign_rpc(
    *,
    code: str,
    salon_id: str,
    user_id: str,
    booking_amount: float,
) -> Dict[str, Any]:
    resp = await supabase.request(
        "POST",
        "rest/v1/rpc/validate_campaign_grant",
        json={
            "p_code": code.upper(),
            "p_salon_id": salon_id,
            "p_user_id": user_id,
            "p_booking_amount": booking_amount,
        },
    )
    if resp.status_code != 200:
        return {"valid": False, "error": "Failed to validate offer"}
    result = resp.json()
    return result if isinstance(result, dict) else {"valid": False, "error": "Invalid response"}


async def is_salon_excluded(campaign_id: str, salon_id: str) -> bool:
    resp = await supabase.request(
        "GET",
        f"rest/v1/campaign_salon_exclusions?campaign_id=eq.{campaign_id}&salon_id=eq.{salon_id}&select=salon_id",
        service_role=True,
    )
    return resp.status_code == 200 and bool(resp.json())
