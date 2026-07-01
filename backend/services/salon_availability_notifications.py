"""Salon open/close notifications + the auto-reopen / reminder sweep.

Driven by an admin-token cron endpoint (POST /salons/internal/run-availability),
same pattern as subscription trial reminders.

Two jobs per sweep:
  1. Auto-reopen: salons whose `closed_until` has passed → flip back to open +
     push the owner "you're open again".
  2. Still-closed reminder: salons closed indefinitely (closed_until IS NULL)
     for > 24h, not yet reminded this session → push the owner to reopen.

Closing a salon sends NO customer push (passive badge only) — see docs/NOTIFICATIONS.md.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from core.supabase import supabase
from services.push_notifications import push_service
from services.push_preferences import should_send_push

logger = logging.getLogger("trimit")

REMINDER_AFTER_HOURS = 24


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _push_owner(owner_id: str, *, title: str, body: str, data: Dict[str, Any]) -> bool:
    if not owner_id:
        return False
    allowed, token, reason = await should_send_push(owner_id, "reminders")
    if not allowed:
        logger.info("[SalonAvail] push skipped owner=%s reason=%s", owner_id[:8], reason)
        return False
    return await push_service.send_notification(
        push_token=token,
        title=title,
        body=body,
        data={"channelId": "reminders", **data},
        recipient_user_id=owner_id,
    )


async def notify_owner_reopened(owner_id: str, salon_id: str, salon_name: str) -> None:
    await _push_owner(
        owner_id,
        title="Your salon is open again 🎉",
        body=f"{salon_name} is now accepting bookings.",
        data={"type": "salon_reopened", "salon_id": salon_id},
    )


async def notify_owner_still_closed(owner_id: str, salon_id: str, salon_name: str) -> None:
    await _push_owner(
        owner_id,
        title="Your salon is still closed",
        body=f"{salon_name} isn't taking bookings. Reopen to start getting bookings again.",
        data={"type": "salon_still_closed", "salon_id": salon_id},
    )


async def _patch_salon(salon_id: str, payload: Dict[str, Any]) -> bool:
    resp = await supabase.request(
        "PATCH", f"rest/v1/salons?id=eq.{salon_id}", json=payload, service_role=True
    )
    return resp.status_code in (200, 204)


async def run_availability_sweep() -> Dict[str, int]:
    """Run both jobs. Returns counts for observability."""
    now = _now()
    reopened = 0
    reminded = 0

    # ── Job 1: auto-reopen elapsed windows ──────────────────────────────────
    resp = await supabase.request(
        "GET",
        "rest/v1/salons"
        "?accepting_bookings=eq.false"
        "&closed_until=not.is.null"
        f"&closed_until=lte.{now.isoformat()}"
        "&select=id,owner_id,name",
        service_role=True,
    )
    elapsed: List[Dict[str, Any]] = resp.json() if resp.status_code == 200 else []
    for s in elapsed:
        ok = await _patch_salon(
            s["id"],
            {
                "accepting_bookings": True,
                "closed_until": None,
                "closed_at": None,
                "closed_reason": None,
                "closed_reminder_sent_at": None,
            },
        )
        if ok:
            reopened += 1
            await notify_owner_reopened(s.get("owner_id"), s["id"], s.get("name") or "Your salon")

    # ── Job 2: remind owners closed indefinitely for > 24h ──────────────────
    cutoff = (now - timedelta(hours=REMINDER_AFTER_HOURS)).isoformat()
    resp2 = await supabase.request(
        "GET",
        "rest/v1/salons"
        "?accepting_bookings=eq.false"
        "&closed_until=is.null"
        f"&closed_at=lte.{cutoff}"
        "&select=id,owner_id,name,closed_at,closed_reminder_sent_at",
        service_role=True,
    )
    stale: List[Dict[str, Any]] = resp2.json() if resp2.status_code == 200 else []
    for s in stale:
        # Skip if we already reminded for THIS closed session.
        sent_at = s.get("closed_reminder_sent_at")
        closed_at = s.get("closed_at")
        if sent_at and closed_at and str(sent_at) >= str(closed_at):
            continue
        await notify_owner_still_closed(s.get("owner_id"), s["id"], s.get("name") or "Your salon")
        await _patch_salon(s["id"], {"closed_reminder_sent_at": now.isoformat()})
        reminded += 1

    logger.info("[SalonAvail] sweep reopened=%s reminded=%s", reopened, reminded)
    return {"reopened": reopened, "reminded": reminded}
