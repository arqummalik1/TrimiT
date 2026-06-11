"""
Subscription notifications — trial reminders + lifecycle pushes for owners.

Reminders (driven by the daily runner):
  * 2 days before trial end
  * 1 day before trial end
  * trial expired (day of)

Lifecycle (driven by verify/webhook/cancel):
  * subscription activated, payment success, payment failed, renewed, cancelled

Dedupe: each notification writes a subscription_events row of type
`notif_<key>`; we skip if one already exists for that key, so retries and the
daily cron never double-send.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from core.supabase import supabase
from services.push_notifications import push_service
from services.push_preferences import should_send_push
from services import subscription_service as subs

logger = logging.getLogger("trimit")


async def _already_notified(subscription_id: str, key: str) -> bool:
    resp = await supabase.request(
        "GET",
        f"rest/v1/subscription_events?subscription_id=eq.{subscription_id}"
        f"&event_type=eq.notif_{key}&select=id&limit=1",
        service_role=True,
    )
    return resp.status_code == 200 and bool(resp.json())


async def _send_owner_push(
    *,
    owner_id: str,
    subscription_id: Optional[str],
    key: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    dedupe: bool = True,
) -> bool:
    if dedupe and subscription_id and await _already_notified(subscription_id, key):
        return False

    allowed, token, reason = await should_send_push(owner_id, "reminders")
    if not allowed:
        logger.info("[Sub][Notify] skipped owner=%s key=%s reason=%s",
                    owner_id[:8], key, reason)
        # Still log the event so we don't re-attempt every run.
        if dedupe and subscription_id:
            await subs.log_event(subscription_id, owner_id, f"notif_{key}",
                                 None, None, source="system",
                                 metadata={"skipped": reason})
        return False

    payload = {"type": "subscription", "subscription_event": key, "role_hint": "owner"}
    if data:
        payload.update(data)

    ok = await push_service.send_notification(
        push_token=token,
        title=title,
        body=body,
        data=payload,
        recipient_user_id=owner_id,
    )
    if dedupe and subscription_id:
        await subs.log_event(subscription_id, owner_id, f"notif_{key}",
                             None, None, source="system",
                             metadata={"delivered": ok})
    return ok


# ── lifecycle pushes ─────────────────────────────────────────────────────────
async def notify_activated(owner_id: str, subscription_id: str) -> None:
    await _send_owner_push(
        owner_id=owner_id, subscription_id=subscription_id, key="activated",
        title="TrimiT Pro is active 🎉",
        body="Your subscription is active. All salon features are unlocked.",
        dedupe=False,
    )


async def notify_payment_success(owner_id: str, subscription_id: str, amount_paise: int) -> None:
    await _send_owner_push(
        owner_id=owner_id, subscription_id=subscription_id, key="payment_success",
        title="Payment received",
        body=f"We received your ₹{amount_paise / 100:.0f} TrimiT Pro payment. Thank you!",
        dedupe=False,
    )


async def notify_payment_failed(owner_id: str, subscription_id: str) -> None:
    await _send_owner_push(
        owner_id=owner_id, subscription_id=subscription_id, key="payment_failed",
        title="Payment failed",
        body="We couldn't charge your TrimiT Pro subscription. Please update payment to keep your salon active.",
        dedupe=False,
    )


async def notify_renewed(owner_id: str, subscription_id: str) -> None:
    await _send_owner_push(
        owner_id=owner_id, subscription_id=subscription_id, key="renewed",
        title="Subscription renewed",
        body="Your TrimiT Pro plan renewed successfully.",
        dedupe=False,
    )


async def notify_cancelled(owner_id: str, subscription_id: str) -> None:
    await _send_owner_push(
        owner_id=owner_id, subscription_id=subscription_id, key="cancelled",
        title="Subscription cancelled",
        body="Your TrimiT Pro subscription was cancelled. You can resubscribe anytime.",
        dedupe=False,
    )


async def notify_reactivated(owner_id: str, subscription_id: str) -> None:
    await _send_owner_push(
        owner_id=owner_id, subscription_id=subscription_id, key="reactivated",
        title="Welcome back to TrimiT Pro 🎉",
        body="Your subscription is active again. All salon features are unlocked.",
        dedupe=False,
    )


# ── trial reminder runner ─────────────────────────────────────────────────────
async def run_trial_reminders() -> Dict[str, int]:
    """Scan trial subscriptions and send 2-day / 1-day / expired reminders.
    Idempotent: each (subscription, reminder) sends at most once."""
    resp = await supabase.request(
        "GET",
        "rest/v1/subscriptions?status=eq.trial&select=id,owner_id,trial_end",
        service_role=True,
    )
    rows: List[Dict[str, Any]] = resp.json() if resp.status_code == 200 else []
    now = datetime.now(timezone.utc)

    sent = {"two_day": 0, "one_day": 0, "expired": 0}

    for row in rows:
        trial_end = subs._parse_dt(row.get("trial_end"))
        if not trial_end:
            continue
        sub_id = row["id"]
        owner_id = row["owner_id"]
        secs = (trial_end - now).total_seconds()
        days_left = secs / 86400.0

        if secs <= 0:
            ok = await _send_owner_push(
                owner_id=owner_id, subscription_id=sub_id, key="trial_expired",
                title="Your free trial has ended",
                body="Subscribe to TrimiT Pro (₹299/mo) to keep accepting bookings.",
            )
            if ok:
                sent["expired"] += 1
        elif days_left <= 1:
            ok = await _send_owner_push(
                owner_id=owner_id, subscription_id=sub_id, key="trial_1d",
                title="1 day left in your free trial",
                body="Your TrimiT trial ends tomorrow. Subscribe to TrimiT Pro to stay active.",
            )
            if ok:
                sent["one_day"] += 1
        elif days_left <= 2:
            ok = await _send_owner_push(
                owner_id=owner_id, subscription_id=sub_id, key="trial_2d",
                title="2 days left in your free trial",
                body="Your TrimiT trial ends in 2 days. Subscribe to TrimiT Pro to avoid interruption.",
            )
            if ok:
                sent["two_day"] += 1

    logger.info("[Sub][Notify] trial reminders sent: %s", sent)
    return sent
