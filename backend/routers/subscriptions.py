"""
Subscriptions router (TrimiT Pro). Thin layer over subscription_service /
subscription_billing. All business logic lives in the services.

Routes (mounted under /api/v1/subscriptions):
  GET  /current   - full subscription view (owner)
  GET  /status    - lightweight access view (owner)
  GET  /history   - payment history (owner)
  POST /create    - create Razorpay subscription, return checkout payload
  POST /verify    - verify checkout signature, activate
  POST /cancel    - cancel subscription
  POST /webhook   - Razorpay webhook (signature-verified, idempotent)
  POST /internal/run-reminders - cron-triggered trial reminders (admin token)
"""

from __future__ import annotations

import hmac
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse

from config import settings
from core.limiter import limiter
from core.idempotency import idempotency_required
from core.supabase import supabase
from dependencies.auth import get_current_user
from models.subscriptions import (
    CancelSubscriptionRequest,
    VerifySubscriptionRequest,
    SubscriptionStatus,
)
from services import subscription_service as subs
from services import subscription_billing as billing
from services import subscription_notifications as notify
from services import subscription_invoice_email as invoice_email

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


def _require_owner(current_user: dict) -> str:
    profile = current_user.get("profile") or {}
    if profile.get("role") != "owner":
        raise HTTPException(
            status_code=403,
            detail={"code": "OWNER_ONLY", "message": "Only salon owners have subscriptions"},
        )
    return current_user["id"]


# ── reads ──────────────────────────────────────────────────────────────────
@router.get("/current")
async def get_current(current_user: dict = Depends(get_current_user)):
    owner_id = _require_owner(current_user)
    row = await subs.ensure_trial(owner_id)
    row = await subs.backfill_billing_period_if_needed(owner_id, row)
    return subs.to_subscription_out(row)


@router.get("/status")
async def get_status(current_user: dict = Depends(get_current_user)):
    owner_id = _require_owner(current_user)
    row = await subs.ensure_trial(owner_id)
    access = subs.compute_access(row)
    return {
        "status": access["effective_status"],
        "has_access": access["has_access"],
        "is_trial": access["is_trial"],
        "trial_days_remaining": access["trial_days_remaining"],
        "next_renewal_at": row.get("next_renewal_at"),
        "enforcement_enabled": settings.SUBSCRIPTION_ENFORCEMENT_ENABLED,
    }


@router.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    owner_id = _require_owner(current_user)
    return await subs.get_payment_history(owner_id)


# ── create ───────────────────────────────────────────────────────────────────
@router.post("/create")
@limiter.limit("5/minute")
@idempotency_required(required=False)
async def create_subscription(request: Request, current_user: dict = Depends(get_current_user)):
    owner_id = _require_owner(current_user)
    profile = current_user.get("profile") or {}

    row = await subs.ensure_trial(owner_id)

    # If already active with a live Razorpay subscription, don't create another.
    plan_amount = billing.get_plan_amount_paise()
    if row.get("status") == SubscriptionStatus.active.value and row.get("razorpay_subscription_id"):
        return {
            "subscription_id": row["razorpay_subscription_id"],
            "key_id": settings.RAZORPAY_KEY_ID,
            "plan_id": settings.RAZORPAY_PLAN_ID,
            "amount": plan_amount,
            "currency": "INR",
            "customer_id": row.get("razorpay_customer_id"),
            "already_active": True,
        }

    customer_id = row.get("razorpay_customer_id") or billing.create_customer(
        name=profile.get("name") or "TrimiT Owner",
        email=profile.get("email") or current_user.get("email") or "",
        contact=profile.get("phone"),
    )

    # Stacking: if the owner still has free trial / paid time left, defer the
    # first Razorpay charge to when that window ends so they don't lose those
    # days. Lapsed owners (no future window) start immediately.
    anchor = subs.compute_billing_anchor(row)
    start_at = int(anchor.timestamp()) if anchor else None

    sub = billing.create_subscription(
        start_at=start_at,
        notes={"owner_id": owner_id, "salon_id": str(row.get("salon_id") or "")},
    )

    await subs.update_subscription(
        owner_id,
        {
            "razorpay_subscription_id": sub.get("id"),
            "razorpay_customer_id": customer_id,
            "razorpay_plan_id": settings.RAZORPAY_PLAN_ID,
            "amount": plan_amount,
        },
        event_type="checkout_created",
        source="owner",
        metadata={"razorpay_subscription_id": sub.get("id")},
    )

    return {
        "subscription_id": sub.get("id"),
        "key_id": settings.RAZORPAY_KEY_ID,
        "plan_id": settings.RAZORPAY_PLAN_ID,
        "amount": plan_amount,
        "currency": "INR",
        "customer_id": customer_id,
        "billing_starts_at": anchor.isoformat() if anchor else None,
    }


# ── verify ───────────────────────────────────────────────────────────────────
@router.post("/verify")
@limiter.limit("5/minute")
@idempotency_required(required=True)
async def verify_subscription(
    request: Request,
    payload: VerifySubscriptionRequest,
    current_user: dict = Depends(get_current_user),
):
    owner_id = _require_owner(current_user)
    row = await subs.fetch_subscription(owner_id)
    if not row:
        raise HTTPException(status_code=404, detail={"code": "NO_SUBSCRIPTION", "message": "No subscription"})

    stored = row.get("razorpay_subscription_id")
    if stored and stored != payload.razorpay_subscription_id:
        raise HTTPException(status_code=400, detail={"code": "SUB_MISMATCH", "message": "Subscription mismatch"})

    if not billing.verify_checkout_signature(
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_subscription_id=payload.razorpay_subscription_id,
        razorpay_signature=payload.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail={"code": "BAD_SIGNATURE", "message": "Invalid signature"})

    if row.get("status") == SubscriptionStatus.active.value:
        # Webhook may have flipped us active before /verify ran, leaving period
        # fields empty — backfill so the subscription screen shows real dates.
        if not row.get("current_period_start") or not row.get("next_renewal_at"):
            period = subs.compute_billing_period(row)
            await subs.update_subscription(
                owner_id,
                period,
                event_type="period_backfill",
                source="owner",
                metadata={"reason": "verify_already_active"},
            )
        return JSONResponse(status_code=200, content={"status": "success", "message": "Already active"})

    prior_status = row.get("status")
    is_reactivation = prior_status in (
        SubscriptionStatus.cancelled.value,
        SubscriptionStatus.expired.value,
        SubscriptionStatus.payment_failed.value,
        SubscriptionStatus.past_due.value,
        SubscriptionStatus.grace_period.value,
    )

    now = datetime.now(timezone.utc)
    period = subs.compute_billing_period(row, reference=now)
    period_start = subs._parse_dt(period["current_period_start"]) or now
    deferred = period_start > now
    updated = await subs.update_subscription(
        owner_id,
        {
            "status": SubscriptionStatus.active.value,
            **period,
            "cancel_at_period_end": False,
            "cancelled_at": None,
        },
        event_type="reactivated" if is_reactivation else "activated",
        source="owner",
        metadata={
            "razorpay_payment_id": payload.razorpay_payment_id,
            "prior_status": prior_status,
            "billing_starts_at": period_start.isoformat(),
            "deferred": deferred,
        },
    )

    # Only record a captured payment + receipt when the charge actually happened
    # now. When deferred (start_at in the future), Razorpay has only authorized
    # the mandate — the real charge fires at the anchor and the
    # subscription.charged webhook records that payment and emails the receipt.
    if not deferred:
        await subs.record_payment(
            subscription_id=row["id"],
            owner_id=owner_id,
            amount=row.get("amount", settings.SUBSCRIPTION_PRICE_PAISE),
            status="captured",
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_subscription_id=payload.razorpay_subscription_id,
            paid_at=now.isoformat(),
        )

    try:
        if is_reactivation:
            await notify.notify_reactivated(owner_id, row["id"])
        else:
            await notify.notify_activated(owner_id, row["id"])
    except Exception as e:
        logger.error("[Sub] activate notify failed: %s", e)

    if not deferred:
        try:
            await invoice_email.send_payment_receipt(
                owner_id=owner_id,
                amount_paise=row.get("amount", settings.SUBSCRIPTION_PRICE_PAISE),
                payment_id=payload.razorpay_payment_id,
                paid_at=now.isoformat(),
                next_renewal_at=period["next_renewal_at"],
            )
        except Exception as e:
            logger.error("[Sub] receipt email failed: %s", e)

    msg = (
        "Subscription scheduled — billing starts when your current period ends"
        if deferred
        else "Subscription active"
    )
    return JSONResponse(status_code=200, content={"status": "success", "message": msg})


# ── cancel ───────────────────────────────────────────────────────────────────
@router.post("/cancel")
@limiter.limit("5/minute")
async def cancel_subscription(
    request: Request,
    payload: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
):
    owner_id = _require_owner(current_user)
    row = await subs.fetch_subscription(owner_id)
    if not row or not row.get("razorpay_subscription_id"):
        raise HTTPException(status_code=400, detail={"code": "NO_ACTIVE_SUB", "message": "No active subscription"})

    billing.cancel_subscription(row["razorpay_subscription_id"], at_cycle_end=payload.cancel_at_cycle_end)

    now = datetime.now(timezone.utc)
    if payload.cancel_at_cycle_end:
        await subs.update_subscription(
            owner_id,
            {"cancel_at_period_end": True},
            event_type="cancel_scheduled",
            source="owner",
        )
        return {"status": "scheduled", "message": "Cancels at end of billing cycle"}

    await subs.update_subscription(
        owner_id,
        {"status": SubscriptionStatus.cancelled.value, "cancelled_at": now.isoformat()},
        event_type="cancelled",
        source="owner",
    )
    try:
        await notify.notify_cancelled(owner_id, row["id"])
    except Exception as e:
        logger.error("[Sub] cancel notify failed: %s", e)
    return {"status": "cancelled", "message": "Subscription cancelled"}


# ── webhook ──────────────────────────────────────────────────────────────────
@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    x_razorpay_event_id: Optional[str] = Header(None),
):
    raw = await request.body()

    if not billing.verify_webhook_signature(raw, x_razorpay_signature or ""):
        logger.warning("[Sub][Webhook] invalid signature event_id=%s", x_razorpay_event_id)
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Idempotency: unique event_id. If we've seen it, ack and stop.
    log_insert = await supabase.request(
        "POST",
        "rest/v1/webhook_logs",
        service_role=True,
        json={
            "provider": "razorpay",
            "event_id": x_razorpay_event_id,
            "signature_verified": True,
            "processed": False,
        },
    )
    if log_insert.status_code == 409:
        return {"status": "ok", "duplicate": True}

    try:
        event = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event.get("event", "")
    try:
        await _process_webhook_event(event_type, event)
        processed_ok = True
        err_text = None
    except Exception as e:
        logger.exception("[Sub][Webhook] processing failed event=%s: %s", event_type, e)
        processed_ok = False
        err_text = str(e)[:500]

    await supabase.request(
        "PATCH",
        f"rest/v1/webhook_logs?event_id=eq.{x_razorpay_event_id}",
        service_role=True,
        json={
            "event_type": event_type,
            "payload": event,
            "processed": processed_ok,
            "processing_error": err_text,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    # Always 200 to Razorpay once signature is valid + logged, so it stops
    # retrying; reprocessing is handled via webhook_logs if needed.
    return {"status": "ok"}


def _extract_subscription_id(event: dict) -> Optional[str]:
    payload = event.get("payload", {})
    sub_entity = (payload.get("subscription") or {}).get("entity") or {}
    if sub_entity.get("id"):
        return sub_entity["id"]
    pay_entity = (payload.get("payment") or {}).get("entity") or {}
    return pay_entity.get("subscription_id")


async def _process_webhook_event(event_type: str, event: dict) -> None:
    rzp_sub_id = _extract_subscription_id(event)
    if not rzp_sub_id:
        logger.info("[Sub][Webhook] no subscription id in event=%s", event_type)
        return

    row = await subs.fetch_by_razorpay_subscription(rzp_sub_id)
    if not row:
        logger.warning("[Sub][Webhook] unknown subscription id=%s event=%s", rzp_sub_id, event_type)
        return

    owner_id = row["owner_id"]
    sub_id = row["id"]
    payload = event.get("payload", {})
    pay_entity = (payload.get("payment") or {}).get("entity") or {}
    sub_entity = (payload.get("subscription") or {}).get("entity") or {}

    if event_type in ("subscription.activated", "subscription.authenticated"):
        patch: dict = {"status": SubscriptionStatus.active.value}
        patch.update(subs.billing_period_from_razorpay_entity(sub_entity))
        if not patch.get("current_period_start") or not patch.get("next_renewal_at"):
            patch.update(subs.compute_billing_period(row))
        await subs.update_subscription(
            owner_id, patch,
            event_type="activated", source="webhook",
        )
        await notify.notify_activated(owner_id, sub_id)

    elif event_type == "subscription.charged":
        prior_status = row.get("status")
        now = datetime.now(timezone.utc)
        patch = {
            "status": SubscriptionStatus.active.value,
            "cancel_at_period_end": False,
        }
        # Pull precise billing window from the subscription entity if present.
        cur_start = sub_entity.get("current_start")
        cur_end = sub_entity.get("current_end")
        charge_at = sub_entity.get("charge_at")
        if cur_start:
            patch["current_period_start"] = datetime.fromtimestamp(cur_start, tz=timezone.utc).isoformat()
        if cur_end:
            patch["current_period_end"] = datetime.fromtimestamp(cur_end, tz=timezone.utc).isoformat()
        if charge_at:
            patch["next_renewal_at"] = datetime.fromtimestamp(charge_at, tz=timezone.utc).isoformat()

        await subs.update_subscription(
            owner_id, patch, event_type="charged", source="webhook",
        )
        charged_amount = int(pay_entity.get("amount") or row.get("amount") or settings.SUBSCRIPTION_PRICE_PAISE)
        await subs.record_payment(
            subscription_id=sub_id,
            owner_id=owner_id,
            amount=charged_amount,
            status="captured",
            razorpay_payment_id=pay_entity.get("id"),
            razorpay_order_id=pay_entity.get("order_id"),
            razorpay_invoice_id=pay_entity.get("invoice_id"),
            razorpay_subscription_id=rzp_sub_id,
            method=pay_entity.get("method"),
            paid_at=now.isoformat(),
        )

        lapsed = prior_status in (
            SubscriptionStatus.cancelled.value,
            SubscriptionStatus.expired.value,
            SubscriptionStatus.payment_failed.value,
            SubscriptionStatus.past_due.value,
            SubscriptionStatus.grace_period.value,
        )
        if lapsed:
            await notify.notify_reactivated(owner_id, sub_id)
        else:
            await notify.notify_renewed(owner_id, sub_id)

        # Receipt email for every successful charge (no-op if Resend unset).
        try:
            await invoice_email.send_payment_receipt(
                owner_id=owner_id,
                amount_paise=charged_amount,
                payment_id=pay_entity.get("id"),
                paid_at=now.isoformat(),
                next_renewal_at=patch.get("next_renewal_at"),
            )
        except Exception as e:
            logger.error("[Sub][Webhook] receipt email failed: %s", e)

    elif event_type == "subscription.completed":
        await subs.update_subscription(
            owner_id, {"status": SubscriptionStatus.expired.value},
            event_type="completed", source="webhook",
        )

    elif event_type == "subscription.cancelled":
        await subs.update_subscription(
            owner_id,
            {"status": SubscriptionStatus.cancelled.value,
             "cancelled_at": datetime.now(timezone.utc).isoformat()},
            event_type="cancelled", source="webhook",
        )
        await notify.notify_cancelled(owner_id, sub_id)

    elif event_type in ("subscription.halted", "subscription.pending"):
        await subs.update_subscription(
            owner_id, {"status": SubscriptionStatus.past_due.value},
            event_type="past_due", source="webhook",
        )
        await notify.notify_payment_failed(owner_id, sub_id)

    elif event_type == "payment.failed":
        await subs.update_subscription(
            owner_id, {"status": SubscriptionStatus.payment_failed.value},
            event_type="payment_failed", source="webhook",
        )
        await subs.record_payment(
            subscription_id=sub_id,
            owner_id=owner_id,
            amount=int(pay_entity.get("amount") or row.get("amount") or settings.SUBSCRIPTION_PRICE_PAISE),
            status="failed",
            razorpay_payment_id=pay_entity.get("id"),
            razorpay_subscription_id=rzp_sub_id,
            method=pay_entity.get("method"),
        )
        await notify.notify_payment_failed(owner_id, sub_id)

    else:
        logger.info("[Sub][Webhook] unhandled event=%s", event_type)


# ── internal: cron-triggered trial reminders ─────────────────────────────────
def _require_admin_token(authorization: Optional[str]) -> None:
    if not settings.ADMIN_API_TOKEN:
        raise HTTPException(status_code=404, detail="Not Found")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    presented = authorization.split(" ", 1)[1].strip()
    if not hmac.compare_digest(presented, settings.ADMIN_API_TOKEN):
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/internal/run-reminders")
async def run_reminders(request: Request, authorization: Optional[str] = Header(None)):
    _require_admin_token(authorization)
    sent = await notify.run_trial_reminders()
    return {"status": "ok", "sent": sent}
