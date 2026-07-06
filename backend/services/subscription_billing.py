"""
Razorpay recurring-subscription integration for TrimiT Pro.

Uses Razorpay Subscriptions (auto-recurring). Flow:
  1. create_subscription() -> creates a Razorpay subscription against the
     configured plan, returns its id for checkout.
  2. Client opens Razorpay checkout with `subscription_id`.
  3. verify_checkout_signature() validates the handler response server-side.
  4. Webhooks (subscription.charged / activated / cancelled / payment.failed)
     drive the authoritative lifecycle.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any, Dict, Optional

import razorpay
from fastapi import HTTPException

from config import settings

logger = logging.getLogger("trimit")

# Long horizon so the mandate keeps renewing monthly (Razorpay requires a
# bounded total_count; 120 = 10 years of monthly cycles).
DEFAULT_TOTAL_COUNT = 120
_plan_amount_cache: Optional[int] = None


def get_plan_amount_paise() -> int:
    """Monthly plan amount from Razorpay (authoritative for checkout UI).

    Falls back to SUBSCRIPTION_PRICE_PAISE when the gateway/plan is not configured
    or the plan fetch fails. Cached for the process lifetime.
    """
    global _plan_amount_cache
    if _plan_amount_cache is not None:
        return _plan_amount_cache

    plan_id = settings.RAZORPAY_PLAN_ID
    if not plan_id or not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return settings.SUBSCRIPTION_PRICE_PAISE

    try:
        plan = _client().plan.fetch(plan_id)
        item = plan.get("item") if isinstance(plan, dict) else None
        amount = int((item or {}).get("amount") or settings.SUBSCRIPTION_PRICE_PAISE)
        _plan_amount_cache = amount
        return amount
    except Exception as e:
        logger.warning("[Sub] plan.fetch failed, using config amount: %s", e)
        return settings.SUBSCRIPTION_PRICE_PAISE


def _client() -> razorpay.Client:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment provider not configured")
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _require_plan() -> str:
    if not settings.RAZORPAY_PLAN_ID:
        raise HTTPException(
            status_code=503,
            detail={"code": "PLAN_NOT_CONFIGURED", "message": "Subscription plan not configured"},
        )
    return settings.RAZORPAY_PLAN_ID


def create_customer(name: str, email: str, contact: Optional[str]) -> Optional[str]:
    client = _client()
    try:
        payload: Dict[str, Any] = {"name": name or "TrimiT Owner", "fail_existing": "0"}
        if email:
            payload["email"] = email
        if contact:
            payload["contact"] = contact
        customer = client.customer.create(payload)
        return customer.get("id")
    except Exception as e:
        logger.warning("[Sub] customer.create failed (non-fatal): %s", e)
        return None


def create_subscription(
    *,
    start_at: Optional[int] = None,
    notes: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    client = _client()
    plan_id = _require_plan()
    params: Dict[str, Any] = {
        "plan_id": plan_id,
        "total_count": DEFAULT_TOTAL_COUNT,
        "customer_notify": 1,
        "notes": notes or {},
    }
    # Defer the first charge to the end of the current free trial / paid cycle so
    # a new subscription "stacks" onto the remaining time instead of charging
    # immediately and wasting those days. Razorpay authorizes the mandate now and
    # raises the first invoice at start_at.
    if start_at:
        params["start_at"] = start_at
    try:
        sub = client.subscription.create(params)
        return sub
    except Exception as e:
        logger.error("[Sub] subscription.create failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail={"code": "RZP_SUBSCRIPTION_FAILED", "message": "Could not create subscription"},
        )


def cancel_subscription(rzp_subscription_id: str, *, at_cycle_end: bool) -> Dict[str, Any]:
    client = _client()
    try:
        return client.subscription.cancel(
            rzp_subscription_id,
            {"cancel_at_cycle_end": 1 if at_cycle_end else 0},
        )
    except Exception as e:
        logger.error("[Sub] subscription.cancel failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail={"code": "RZP_CANCEL_FAILED", "message": "Could not cancel subscription"},
        )


def verify_checkout_signature(
    *, razorpay_payment_id: str, razorpay_subscription_id: str, razorpay_signature: str
) -> bool:
    """Razorpay subscription checkout signature:
    HMAC_SHA256(payment_id + '|' + subscription_id, key_secret)."""
    if not settings.RAZORPAY_KEY_SECRET:
        return False
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{razorpay_payment_id}|{razorpay_subscription_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Webhook signature: HMAC_SHA256(raw_body, webhook_secret)."""
    if not settings.RAZORPAY_WEBHOOK_SECRET or not signature:
        return False
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
