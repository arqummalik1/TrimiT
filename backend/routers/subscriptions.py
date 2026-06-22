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
    raise HTTPException(status_code=501, detail={"code": "NO_GATEWAY", "message": "Payment Gateway is being updated. Subscriptions disabled."})

# ── verify ───────────────────────────────────────────────────────────────────
@router.post("/verify")
@limiter.limit("5/minute")
@idempotency_required(required=True)
async def verify_subscription(
    request: Request,
    payload: VerifySubscriptionRequest,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail={"code": "NO_GATEWAY", "message": "Payment Gateway is being updated."})

# ── cancel ───────────────────────────────────────────────────────────────────
@router.post("/cancel")
@limiter.limit("5/minute")
async def cancel_subscription(
    request: Request,
    payload: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail={"code": "NO_GATEWAY", "message": "Payment Gateway is being updated. Cannot cancel online right now."})

# ── webhook ──────────────────────────────────────────────────────────────────
@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    x_razorpay_event_id: Optional[str] = Header(None),
):
    return {"status": "ok", "message": "Webhook deactivated"}


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
