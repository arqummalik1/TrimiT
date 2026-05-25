"""
Broadcast push notifications (Zomato/Blinkit-style marketing pushes).

The booking notification system in services/push_dispatch.py is per-event and
deduped per (booking, event_type, user). This module is independent: an admin
queues one broadcast targeting a role audience (customers / owners / all),
and we fan out to every eligible user's Expo push token.

A user is eligible when:
  - users.role matches the audience (or audience is 'all'),
  - users.push_token is a valid Expo token,
  - users.push_enabled is true (master switch),
  - users.notify_promotional is true (promotional opt-in; default false).

Every broadcast is recorded in public.broadcast_notifications with the final
delivered/failed counters so admins have an audit log.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from core.supabase import supabase
from services.push_notifications import push_service

logger = logging.getLogger("trimit")

VALID_AUDIENCES = ("customers", "owners", "all")

# How many users to pull per page from Supabase REST when fanning out. The
# fan-out itself is chunked into 100-message HTTP requests to Expo inside
# push_service.send_batch_notifications.
_USER_PAGE_SIZE = 1000


async def _fetch_eligible_recipients(audience: str) -> List[Dict[str, Any]]:
    """Pull every eligible user (push_enabled + notify_promotional + valid token)
    matching the audience filter. Uses service-role to bypass RLS — this is an
    admin-only path."""

    base = (
        "rest/v1/users"
        "?select=id,role,push_token,push_enabled,notify_promotional"
        "&push_enabled=eq.true"
        "&notify_promotional=eq.true"
        "&push_token=not.is.null"
    )
    if audience in ("customers", "owners"):
        role_value = "customer" if audience == "customers" else "owner"
        base = f"{base}&role=eq.{role_value}"

    out: List[Dict[str, Any]] = []
    offset = 0
    while True:
        url = f"{base}&limit={_USER_PAGE_SIZE}&offset={offset}"
        resp = await supabase.request("GET", url, service_role=True)
        if resp.status_code != 200:
            logger.error(
                "[Broadcast] fetch recipients failed status=%s body=%s",
                resp.status_code,
                resp.text[:200],
            )
            break
        rows = resp.json() or []
        out.extend(rows)
        if len(rows) < _USER_PAGE_SIZE:
            break
        offset += _USER_PAGE_SIZE
    return out


async def _record_broadcast(
    *,
    audience: str,
    title: str,
    body: str,
    data: Dict[str, Any],
    recipients_count: int,
    delivered_count: int,
    failed_count: int,
    created_by: Optional[str],
) -> Optional[str]:
    payload = {
        "audience": audience,
        "title": title,
        "body": body,
        "data": data or {},
        "recipients_count": recipients_count,
        "delivered_count": delivered_count,
        "failed_count": failed_count,
        "created_by": created_by,
    }
    resp = await supabase.request(
        "POST",
        "rest/v1/broadcast_notifications",
        service_role=True,
        json=payload,
    )
    if resp.status_code not in (200, 201):
        logger.error(
            "[Broadcast] failed to persist audit row status=%s body=%s",
            resp.status_code,
            resp.text[:200],
        )
        return None
    rows = resp.json() or []
    if isinstance(rows, list) and rows:
        return rows[0].get("id")
    if isinstance(rows, dict):
        return rows.get("id")
    return None


async def send_broadcast(
    *,
    audience: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    created_by: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fan out a broadcast push to all eligible recipients in `audience`.

    Returns a summary dict with counts and the audit row id.
    """
    if audience not in VALID_AUDIENCES:
        raise ValueError(f"invalid audience: {audience}")
    title_clean = (title or "").strip()
    body_clean = (body or "").strip()
    if not title_clean or not body_clean:
        raise ValueError("title and body are required")
    if len(title_clean) > 80:
        raise ValueError("title must be <= 80 chars")
    if len(body_clean) > 240:
        raise ValueError("body must be <= 240 chars")

    recipients = await _fetch_eligible_recipients(audience)
    recipients_count = len(recipients)
    logger.info(
        "[Broadcast] audience=%s eligible_recipients=%s title=%r",
        audience,
        recipients_count,
        title_clean,
    )

    payload_data: Dict[str, Any] = {"type": "broadcast", "audience": audience}
    if data:
        # Reserved keys from the platform always win over caller payload.
        for k, v in data.items():
            if k not in payload_data:
                payload_data[k] = v

    notifications = [
        {
            "push_token": row.get("push_token"),
            "title": title_clean,
            "body": body_clean,
            "data": payload_data,
            "channelId": "promotions",
            "priority": "high",
            "sound": "default",
        }
        for row in recipients
        if row.get("push_token")
    ]

    if not notifications:
        broadcast_id = await _record_broadcast(
            audience=audience,
            title=title_clean,
            body=body_clean,
            data=payload_data,
            recipients_count=recipients_count,
            delivered_count=0,
            failed_count=0,
            created_by=created_by,
        )
        return {
            "broadcast_id": broadcast_id,
            "audience": audience,
            "recipients_count": recipients_count,
            "delivered_count": 0,
            "failed_count": 0,
        }

    result = await push_service.send_batch_notifications(notifications)
    delivered = int(result.get("success") or 0)
    failed = int(result.get("failed") or 0)

    broadcast_id = await _record_broadcast(
        audience=audience,
        title=title_clean,
        body=body_clean,
        data=payload_data,
        recipients_count=recipients_count,
        delivered_count=delivered,
        failed_count=failed,
        created_by=created_by,
    )

    logger.info(
        "[Broadcast] sent audience=%s recipients=%s delivered=%s failed=%s id=%s",
        audience,
        recipients_count,
        delivered,
        failed,
        broadcast_id,
    )

    return {
        "broadcast_id": broadcast_id,
        "audience": audience,
        "recipients_count": recipients_count,
        "delivered_count": delivered,
        "failed_count": failed,
    }


async def list_recent_broadcasts(limit: int = 50) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit or 50), 200))
    resp = await supabase.request(
        "GET",
        (
            "rest/v1/broadcast_notifications"
            "?select=id,audience,title,body,data,recipients_count,delivered_count,"
            "failed_count,created_at"
            f"&order=created_at.desc&limit={limit}"
        ),
        service_role=True,
    )
    if resp.status_code != 200:
        logger.error(
            "[Broadcast] list failed status=%s body=%s",
            resp.status_code,
            resp.text[:200],
        )
        return []
    return resp.json() or []
