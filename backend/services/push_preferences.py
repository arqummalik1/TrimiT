"""
Push notification preference checks and idempotent event logging.
"""

from __future__ import annotations

import logging
from typing import Optional

from core.supabase import supabase

logger = logging.getLogger("trimit")

_CATEGORY_PREF = {
    "bookings": "notify_bookings",
    "booking_updates": "notify_booking_updates",
    "promotional": "notify_promotional",
    "reminders": "notify_reminders",
}


async def clear_user_push_token(user_id: str) -> None:
    resp = await supabase.request(
        "PATCH",
        f"rest/v1/users?id=eq.{user_id}",
        json={"push_token": None},
        service_role=True,
    )
    if resp.status_code not in (200, 201, 204):
        logger.warning(
            "[Push] clear_user_push_token failed user=%s status=%s",
            user_id[:8],
            resp.status_code,
        )


async def get_user_push_prefs(user_id: str) -> dict:
    resp = await supabase.request(
        "GET",
        f"rest/v1/users?id=eq.{user_id}&select=push_enabled,notify_bookings,notify_booking_updates,notify_promotional,notify_reminders,push_token",
        service_role=True,
    )
    if resp.status_code != 200 or not resp.json():
        return {
            "push_enabled": True,
            "notify_bookings": True,
            "notify_booking_updates": True,
            "notify_promotional": False,
            "notify_reminders": True,
            "push_token": None,
        }
    row = resp.json()[0]
    return {
        "push_enabled": row.get("push_enabled", True),
        "notify_bookings": row.get("notify_bookings", True),
        "notify_booking_updates": row.get("notify_booking_updates", True),
        "notify_promotional": row.get("notify_promotional", False),
        "notify_reminders": row.get("notify_reminders", True),
        "push_token": row.get("push_token"),
    }


async def should_send_push(user_id: str, category: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Returns (allowed, push_token, skip_reason)."""
    prefs = await get_user_push_prefs(user_id)
    if not prefs.get("push_enabled", True):
        return False, None, "push_disabled_master"
    pref_key = _CATEGORY_PREF.get(category, "notify_booking_updates")
    if not prefs.get(pref_key, True):
        return False, None, f"pref_{pref_key}_off"
    token = prefs.get("push_token")
    if not token:
        return False, None, "no_push_token"
    return True, token, None


async def is_duplicate_notification(
    booking_id: str,
    event_type: str,
    recipient_user_id: str,
) -> bool:
    existing = await supabase.request(
        "GET",
        (
            f"rest/v1/notification_events?booking_id=eq.{booking_id}"
            f"&event_type=eq.{event_type}"
            f"&recipient_user_id=eq.{recipient_user_id}&select=id"
        ),
        service_role=True,
    )
    return existing.status_code == 200 and bool(existing.json())


async def mark_notification_sent(
    booking_id: str,
    event_type: str,
    recipient_user_id: str,
) -> None:
    resp = await supabase.request(
        "POST",
        "rest/v1/notification_events",
        json={
            "booking_id": booking_id,
            "event_type": event_type,
            "recipient_user_id": recipient_user_id,
        },
        service_role=True,
    )
    if resp.status_code == 409:
        logger.info(
            "[Push] dedupe race booking_id=%s type=%s",
            booking_id,
            event_type,
        )
    elif resp.status_code not in (200, 201):
        logger.warning(
            "[Push] mark_notification_sent status=%s body=%s",
            resp.status_code,
            resp.text[:300] if resp.text else "",
        )
