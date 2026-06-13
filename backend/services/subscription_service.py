"""
Subscription service — the SINGLE SOURCE OF TRUTH for owner subscription
state and premium access.

Rules:
  * All reads/writes go through service-role Supabase calls (RLS is the last
    line of defense; this layer enforces correctness).
  * Access is computed here, never derived on the client.
  * Every state transition is written to subscription_events (audit trail).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, List

from config import settings
from core.supabase import supabase
from models.subscriptions import ACCESS_GRANTING_STATUSES, SubscriptionStatus

logger = logging.getLogger("trimit")


# ── helpers ────────────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(raw: Any) -> Optional[datetime]:
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


# ── reads ──────────────────────────────────────────────────────────────────
async def fetch_subscription(owner_id: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/subscriptions?owner_id=eq.{owner_id}&select=*&limit=1",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None


async def fetch_by_razorpay_subscription(rzp_sub_id: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/subscriptions?razorpay_subscription_id=eq.{rzp_sub_id}&select=*&limit=1",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None


async def ensure_trial(owner_id: str) -> Dict[str, Any]:
    """Defensive: the DB trigger creates the trial on owner signup. If a row is
    somehow missing (legacy/manual), create it idempotently."""
    existing = await fetch_subscription(owner_id)
    if existing:
        return existing

    trial_end = _now() + timedelta(days=settings.SUBSCRIPTION_TRIAL_DAYS)
    resp = await supabase.request(
        "POST",
        "rest/v1/subscriptions",
        service_role=True,
        json={
            "owner_id": owner_id,
            "status": SubscriptionStatus.trial.value,
            "plan": "trimit_pro",
            "trial_start": _now().isoformat(),
            "trial_end": trial_end.isoformat(),
            "amount": settings.SUBSCRIPTION_PRICE_PAISE,
            "currency": "INR",
        },
    )
    if resp.status_code in (200, 201) and resp.json():
        row = resp.json()[0]
        await log_event(row["id"], owner_id, "trial_started", None,
                        SubscriptionStatus.trial.value, source="system")
        return row
    # Row may have been created concurrently (unique owner_id) — re-read.
    existing = await fetch_subscription(owner_id)
    if existing:
        return existing
    raise RuntimeError("Could not create or fetch subscription")


# ── access computation (source of truth) ────────────────────────────────────
def compute_access(row: Dict[str, Any]) -> Dict[str, Any]:
    """Returns the EFFECTIVE access view for a subscription row, resolving a
    lapsed trial to 'expired' even if the daily cron has not run yet."""
    status = row.get("status") or SubscriptionStatus.expired.value
    trial_end = _parse_dt(row.get("trial_end"))
    now = _now()

    effective = status
    if status == SubscriptionStatus.trial.value and trial_end and trial_end < now:
        effective = SubscriptionStatus.expired.value

    trial_days_remaining = 0
    if effective == SubscriptionStatus.trial.value and trial_end:
        secs = (trial_end - now).total_seconds()
        # ceil of remaining whole days (so "ends in 18h" shows as 1 day left)
        trial_days_remaining = max(0, int((secs + 86399) // 86400)) if secs > 0 else 0

    return {
        "effective_status": effective,
        "has_access": effective in ACCESS_GRANTING_STATUSES,
        "is_trial": effective == SubscriptionStatus.trial.value,
        "trial_days_remaining": trial_days_remaining,
    }


def compute_billing_anchor(row: Dict[str, Any]) -> Optional[datetime]:
    """When a NEW paid cycle should begin so re-subscribing "stacks" onto the
    remaining time instead of discarding it.

    Returns a FUTURE datetime to defer the first charge to, or None to begin
    immediately:
      * On trial with trial_end in the future -> defer to trial_end
        (owner keeps every free day; billing starts the day the trial ends).
      * Active / grace_period with current_period_end in the future (early
        renewal) -> defer to current_period_end (new cycle picks up exactly
        where the paid one ends).
      * Otherwise (expired / cancelled / lapsed) -> None (start now).
    """
    now = _now()
    access = compute_access(row)
    eff = access["effective_status"]

    if eff == SubscriptionStatus.trial.value:
        trial_end = _parse_dt(row.get("trial_end"))
        if trial_end and trial_end > now:
            return trial_end

    if eff in (SubscriptionStatus.active.value, SubscriptionStatus.grace_period.value):
        period_end = _parse_dt(row.get("current_period_end"))
        if period_end and period_end > now:
            return period_end

    return None


async def has_active_access(owner_id: str) -> bool:
    row = await fetch_subscription(owner_id)
    if not row:
        # No row at all — be safe and grant (Phase 1 won't enforce anyway).
        return True
    return compute_access(row)["has_access"]


def to_subscription_out(row: Dict[str, Any]) -> Dict[str, Any]:
    access = compute_access(row)
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "salon_id": row.get("salon_id"),
        "plan": row.get("plan", "trimit_pro"),
        "status": access["effective_status"],
        "has_access": access["has_access"],
        "is_trial": access["is_trial"],
        "trial_days_remaining": access["trial_days_remaining"],
        "trial_start": row.get("trial_start"),
        "trial_end": row.get("trial_end"),
        "current_period_start": row.get("current_period_start"),
        "current_period_end": row.get("current_period_end"),
        "next_renewal_at": row.get("next_renewal_at"),
        "cancel_at_period_end": row.get("cancel_at_period_end", False),
        "cancelled_at": row.get("cancelled_at"),
        "amount": row.get("amount", settings.SUBSCRIPTION_PRICE_PAISE),
        "currency": row.get("currency", "INR"),
        "razorpay_subscription_id": row.get("razorpay_subscription_id"),
        "created_at": row.get("created_at"),
    }


# ── writes ───────────────────────────────────────────────────────────────────
async def log_event(
    subscription_id: Optional[str],
    owner_id: Optional[str],
    event_type: str,
    from_status: Optional[str],
    to_status: Optional[str],
    *,
    source: str = "system",
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    try:
        await supabase.request(
            "POST",
            "rest/v1/subscription_events",
            service_role=True,
            json={
                "subscription_id": subscription_id,
                "owner_id": owner_id,
                "event_type": event_type,
                "from_status": from_status,
                "to_status": to_status,
                "source": source,
                "metadata": metadata or {},
            },
        )
    except Exception as e:  # never let audit logging break a flow
        logger.error("[Sub] log_event failed: %s", e)


async def update_subscription(
    owner_id: str,
    patch: Dict[str, Any],
    *,
    event_type: Optional[str] = None,
    source: str = "system",
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    current = await fetch_subscription(owner_id)
    from_status = current.get("status") if current else None

    resp = await supabase.request(
        "PATCH",
        f"rest/v1/subscriptions?owner_id=eq.{owner_id}",
        service_role=True,
        json=patch,
    )
    if resp.status_code not in (200, 201, 204):
        logger.error("[Sub] update failed owner=%s status=%s body=%s",
                     owner_id, resp.status_code, resp.text[:300])
        return None

    row = resp.json()[0] if resp.json() else await fetch_subscription(owner_id)
    if event_type and row:
        await log_event(
            row.get("id"), owner_id, event_type,
            from_status, patch.get("status", from_status),
            source=source, metadata=metadata,
        )
    return row


async def record_payment(
    *,
    subscription_id: str,
    owner_id: str,
    amount: int,
    status: str,
    razorpay_payment_id: Optional[str] = None,
    razorpay_invoice_id: Optional[str] = None,
    razorpay_order_id: Optional[str] = None,
    razorpay_subscription_id: Optional[str] = None,
    method: Optional[str] = None,
    paid_at: Optional[str] = None,
    currency: str = "INR",
) -> None:
    # Idempotent on razorpay_payment_id (unique). Skip if already recorded.
    if razorpay_payment_id:
        existing = await supabase.request(
            "GET",
            f"rest/v1/subscription_payments?razorpay_payment_id=eq.{razorpay_payment_id}&select=id&limit=1",
            service_role=True,
        )
        if existing.status_code == 200 and existing.json():
            return

    await supabase.request(
        "POST",
        "rest/v1/subscription_payments",
        service_role=True,
        json={
            "subscription_id": subscription_id,
            "owner_id": owner_id,
            "amount": amount,
            "currency": currency,
            "status": status,
            "method": method,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_invoice_id": razorpay_invoice_id,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_subscription_id": razorpay_subscription_id,
            "paid_at": paid_at,
        },
    )


async def get_payment_history(owner_id: str) -> Dict[str, Any]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/subscription_payments?owner_id=eq.{owner_id}"
        f"&select=id,amount,currency,status,method,razorpay_payment_id,razorpay_invoice_id,paid_at,created_at"
        f"&order=created_at.desc",
        service_role=True,
    )
    payments: List[Dict[str, Any]] = resp.json() if resp.status_code == 200 else []
    total_paid = sum(
        int(p.get("amount") or 0) for p in payments if p.get("status") == "captured"
    )
    return {"total_paid": total_paid, "currency": "INR", "payments": payments}


# ── admin analytics ──────────────────────────────────────────────────────────
async def admin_analytics() -> Dict[str, Any]:
    resp = await supabase.request(
        "GET",
        "rest/v1/subscriptions?select=status",
        service_role=True,
    )
    rows = resp.json() if resp.status_code == 200 else []

    counts: Dict[str, int] = {}
    for r in rows:
        s = r.get("status", "unknown")
        counts[s] = counts.get(s, 0) + 1

    active = counts.get("active", 0)
    mrr = active * (settings.SUBSCRIPTION_PRICE_PAISE / 100.0)

    pay_resp = await supabase.request(
        "GET",
        "rest/v1/subscription_payments?status=eq.captured&select=amount",
        service_role=True,
    )
    paid_rows = pay_resp.json() if pay_resp.status_code == 200 else []
    total_revenue = sum(int(p.get("amount") or 0) for p in paid_rows) / 100.0

    return {
        "total_subscribers": len(rows),
        "active_subscriptions": active,
        "trial_users": counts.get("trial", 0),
        "expired_subscriptions": counts.get("expired", 0),
        "cancelled_subscriptions": counts.get("cancelled", 0),
        "past_due": counts.get("past_due", 0),
        "payment_failed": counts.get("payment_failed", 0),
        "grace_period": counts.get("grace_period", 0),
        "mrr": round(mrr, 2),
        "arr": round(mrr * 12, 2),
        "total_revenue_collected": round(total_revenue, 2),
        "currency": "INR",
        "status_breakdown": counts,
    }
