"""Payments router (Layer B — PayU online payments + split settlement).

Every route here is gated behind the server-side feature flag
``PAYU_PAYOUTS_ENABLED`` (OFF by default). While the flag is OFF the
online-payment surface returns a clean structured ``ONLINE_PAYMENT_DISABLED``
and never contacts PayU, so old Play Store builds degrade gracefully and the
existing booking / pay-at-salon path is untouched.

Money rule: all internal amounts are integer **paise**. Bookings store their
amount in **rupees** (see ``routers/bookings.py`` — ``p_amount = final_amount``
is a rupee float), so we convert rupees → paise once, server-side, using
``Decimal`` (never float math for money). The client never supplies an amount
(Req 17.1, 17.2); it is derived solely from server-side booking data.

Tasks 13–16 replace the verify / webhook / status stubs below — they are left
intact here on purpose so nothing else breaks while this file grows.
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from config import settings
from core.feature_flags import payu_payouts_enabled
from core.limiter import limiter
from core.supabase import supabase
from dependencies.auth import get_current_user
from models.payments import PaymentCreate, PayuVerifyRequest, RefundCreate
from services import payu_service
from services.commission import (
    MAX_AMOUNT_PAISE,
    MIN_AMOUNT_PAISE,
    compute_split,
    get_commission_percent,
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/payments", tags=["Payments"])

# Idempotency-Key bounds (Req 6.4): 1..255 characters.
_IDEMPOTENCY_KEY_MAX_LEN = 255
# Max payment attempts per booking (Req 9.3, 9.4).
_MAX_PAYMENT_ATTEMPTS = 3
# Idempotency record retention (mirrors core/idempotency.py result TTL).
_IDEMPOTENCY_RESULT_TTL_HOURS = 24


def _err(status_code: int, code: str, message: str) -> HTTPException:
    """Build an HTTPException carrying a structured ``{code, message}`` detail.

    The global handler (core/exceptions.py) wraps this into
    ``{"error": {"code", "message", "details": {code, message}}}``.
    """
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


def _rupees_to_paise(amount_rupees: Any) -> int:
    """Convert a booking's rupee amount to integer paise.

    ASSUMPTION (verified in routers/bookings.py): the bookings ``amount`` column
    is stored in **rupees** as a numeric/float (e.g. ``100`` => ₹100.00). We
    convert to paise here using ``Decimal`` with half-up rounding so money never
    touches floating-point arithmetic. ``100`` rupees → ``10000`` paise.
    """
    rupees = Decimal(str(amount_rupees))
    paise = (rupees * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paise)


# ---------------------------------------------------------------------------
# Idempotency helpers (explicit so we can return structured codes and detect
# booking/amount conflicts — the generic decorator keys only by user+key+path).
# ---------------------------------------------------------------------------


async def _idempotency_lookup(user_id: str, key: str, path: str) -> Optional[dict]:
    """Return the stored idempotency row for (user, key, path), or ``None``."""
    resp = await supabase.request(
        "GET",
        f"rest/v1/idempotency_keys?user_id=eq.{user_id}"
        f"&idempotency_key=eq.{key}&request_path=eq.{path}"
        "&select=response_status,response_body",
        service_role=True,
    )
    if resp.status_code == 200:
        rows = resp.json()
        if rows:
            return rows[0]
    return None


async def _idempotency_store(
    user_id: str, key: str, path: str, status_code: int, body: dict
) -> None:
    """Persist the idempotent response so a replay returns it without re-running."""
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=_IDEMPOTENCY_RESULT_TTL_HOURS)
    ).isoformat()
    try:
        await supabase.request(
            "POST",
            "rest/v1/idempotency_keys",
            service_role=True,
            json={
                "user_id": user_id,
                "idempotency_key": key,
                "request_path": path,
                "response_status": status_code,
                "response_body": body,
                "expires_at": expires_at,
            },
        )
    except Exception:
        # Storage failure must not fail the (already successful) order creation.
        logger.warning("Failed to store payment idempotency record", exc_info=True)


@router.post("/create-order")
@limiter.limit("10/minute")
async def create_order(
    request: Request,
    data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a PayU order + split for a booking (Req 6, 7.8, 9.3/9.4, 17.1/17.2).

    Guard order: flag ON → Idempotency-Key present (replay/conflict) → booking
    owned → amount derived server-side → not already paid → under the retry cap
    → salon vendor active. Only then is a pending payment row created and the
    PayU params (key, txnid, amount, hash, surl/furl, split) built and returned.
    """
    # (2) Feature flag — fail closed. No payment, no PayU contact. (Req 4.5)
    if not payu_payouts_enabled():
        raise _err(
            403,
            "ONLINE_PAYMENT_DISABLED",
            "Online payments are currently unavailable.",
        )

    user_id = current_user.get("id")
    path = request.url.path

    # (3) Idempotency-Key required (Req 6.4, 6.5).
    idempotency_key = request.headers.get("Idempotency-Key")
    if not idempotency_key or not (
        1 <= len(idempotency_key) <= _IDEMPOTENCY_KEY_MAX_LEN
    ):
        raise _err(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "An Idempotency-Key header (1-255 chars) is required for this request.",
        )

    # Idempotent replay / conflict (Req 6.6, 6.7). Same key + same booking →
    # return the stored result; same key + different booking → conflict.
    stored = await _idempotency_lookup(user_id, idempotency_key, path)
    if stored:
        stored_body = stored.get("response_body") or {}
        if str(stored_body.get("booking_id")) == str(data.booking_id):
            return JSONResponse(
                status_code=stored.get("response_status", 200),
                content=stored_body,
                headers={"X-Idempotency-Hit": "true"},
            )
        raise _err(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This Idempotency-Key was already used for a different booking.",
        )

    # (4) Load the booking (service-role) and verify ownership. Amount is derived
    # ONLY from server-side booking data — any client-supplied amount is ignored.
    booking_resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{data.booking_id}"
        "&select=id,user_id,salon_id,amount,status",
        service_role=True,
    )
    booking_rows = booking_resp.json() if booking_resp.status_code == 200 else []
    if not booking_rows:
        raise _err(404, "BOOKING_NOT_FOUND", "Booking not found.")
    booking = booking_rows[0]
    if str(booking.get("user_id")) != str(user_id):
        raise _err(403, "BOOKING_FORBIDDEN", "This booking does not belong to you.")

    salon_id = booking.get("salon_id")

    # Derive + validate the payable amount (Req 6.2, 17.1, 17.2).
    try:
        amount_paise = _rupees_to_paise(booking.get("amount"))
    except Exception:
        raise _err(422, "INVALID_AMOUNT", "Booking amount is invalid.")
    if amount_paise < MIN_AMOUNT_PAISE or amount_paise > MAX_AMOUNT_PAISE:
        raise _err(422, "INVALID_AMOUNT", "Booking amount is out of the allowed range.")

    # (5) Existing payments for this booking: already-paid + retry cap.
    payments_resp = await supabase.request(
        "GET",
        f"rest/v1/payments?booking_id=eq.{data.booking_id}"
        "&select=id,payment_status,attempt_count",
        service_role=True,
    )
    existing_payments = (
        payments_resp.json() if payments_resp.status_code == 200 else []
    )
    if any(p.get("payment_status") == "paid" for p in existing_payments):
        raise _err(409, "BOOKING_ALREADY_PAID", "This booking has already been paid.")
    if len(existing_payments) >= _MAX_PAYMENT_ATTEMPTS:
        raise _err(
            409,
            "PAYMENT_RETRY_LIMIT",
            "The maximum number of payment attempts for this booking has been reached.",
        )
    attempt_count = len(existing_payments) + 1

    # (6) Salon must be a payout-ready (active) PayU vendor (Req 6.9, 7.8). No
    # PayU order, no charge otherwise.
    bank_resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}"
        "&select=vendor_status,payu_vendor_id",
        service_role=True,
    )
    bank_rows = bank_resp.json() if bank_resp.status_code == 200 else []
    bank = bank_rows[0] if bank_rows else None
    if not bank or bank.get("vendor_status") != "active":
        raise _err(
            409,
            "SALON_NOT_PAYOUT_READY",
            "This salon is not yet able to receive online payments.",
        )
    vendor_id = bank.get("payu_vendor_id")

    # (7) Compute the split (commission + PayU fee + vendor net == amount).
    commission_percent = await get_commission_percent()
    split = compute_split(
        amount_paise, commission_percent, float(settings.PAYU_FEE_PERCENT)
    )

    # Unique PayU transaction id (Req 6.2). Used as payu_order_id on the row.
    txnid = uuid4().hex

    # Create the pending payment row (service-role). settlement_status pending.
    payment_payload = {
        "booking_id": data.booking_id,
        "salon_id": salon_id,
        "user_id": user_id,
        "amount_paise": split["amount_paise"],
        "commission_paise": split["commission_paise"],
        "payu_fee_paise": split["payu_fee_paise"],
        "vendor_paise": split["vendor_paise"],
        "currency": "INR",
        "payu_order_id": txnid,
        "payment_status": "pending",
        "settlement_status": "pending",
        "attempt_count": attempt_count,
    }
    create_resp = await supabase.request(
        "POST", "rest/v1/payments", service_role=True, json=payment_payload
    )
    if create_resp.status_code not in (200, 201):
        logger.error("Failed to create payment row for booking %s", data.booking_id)
        raise _err(500, "PAYMENT_CREATE_FAILED", "Could not create the payment.")
    created_rows = create_resp.json()
    payment_id = created_rows[0]["id"] if created_rows else None

    # (8/9) Build PayU params + hash (the "order"). surl/furl derive from
    # PUBLIC_SITE_URL (additive). If building the order/hash fails, mark the
    # payment failed and return PAYU_ORDER_FAILED (Req 6.10) — no charge.
    callback_url = f"{settings.PUBLIC_SITE_URL.rstrip('/')}/payment/callback"
    profile = current_user.get("profile") or {}
    firstname = str(profile.get("name") or profile.get("full_name") or "Customer")
    email = str(current_user.get("email") or profile.get("email") or "")
    phone = str(profile.get("phone") or "")
    try:
        payu_params = payu_service.build_payment_params(
            txnid=txnid,
            amount_paise=amount_paise,
            productinfo=f"TrimiT booking {data.booking_id}",
            firstname=firstname,
            email=email,
            phone=phone,
            success_url=callback_url,
            failure_url=callback_url,
            udf={"udf1": data.booking_id, "udf2": str(payment_id or "")},
            split={**split, "payu_vendor_id": vendor_id},
        )
    except Exception:
        logger.warning("PayU order setup failed for booking %s", data.booking_id, exc_info=True)
        await supabase.request(
            "PATCH",
            f"rest/v1/payments?id=eq.{payment_id}",
            service_role=True,
            json={"payment_status": "failed"},
        )
        raise _err(502, "PAYU_ORDER_FAILED", "The payment order could not be created.")

    result = {
        "payment_id": payment_id,
        "booking_id": data.booking_id,
        "amount_paise": amount_paise,
        "currency": "INR",
        "payment_status": "pending",
        "payu": payu_params,
    }

    # Store for idempotent replay (Req 6.6).
    await _idempotency_store(user_id, idempotency_key, path, 200, result)

    return JSONResponse(status_code=200, content=result)


# Payment statuses that are FINAL — once a payment reaches one of these, a
# repeated PayU result is acknowledged without re-mutating (Req 8.6).
_FINAL_PAYMENT_STATUSES = frozenset(
    {"paid", "failed", "refunded", "partially_refunded"}
)
# PayU transaction statuses that indicate a successful capture (Req 8.2).
_PAYU_SUCCESS_STATUSES = frozenset({"success", "captured"})


async def _read_posted_fields(request: Request) -> dict:
    """Read PayU's posted result fields, handling BOTH form-encoded and JSON.

    PayU posts the callback as ``application/x-www-form-urlencoded`` on the
    browser redirect, but we also accept JSON so the same endpoint is usable by
    JSON clients/tests. Robust to a missing/odd content-type: tries the declared
    type first, then falls back to the other. Returns a plain ``{str: str}``
    dict; on any parse failure returns ``{}`` (the hash check then rejects it).
    """
    ctype = (request.headers.get("content-type") or "").lower()
    if "json" in ctype:
        try:
            data = await request.json()
            return {str(k): v for k, v in data.items()} if isinstance(data, dict) else {}
        except Exception:
            return {}
    # Default + fallback: form-encoded.
    try:
        form = await request.form()
        return {str(k): v for k, v in form.items()}
    except Exception:
        try:
            data = await request.json()
            return {str(k): v for k, v in data.items()} if isinstance(data, dict) else {}
        except Exception:
            return {}


def _audit_sanitize(posted: dict) -> dict:
    """Build a PII/secret-free snapshot of a PayU result for the audit log.

    Stores only non-sensitive identifiers (txnid, status, mihpayid, amount).
    Deliberately EXCLUDES the hash (a signature), email and firstname (PII), and
    any other posted field, so neither the audit row nor any log line leaks
    sensitive data (Req 13.5, 8.4).
    """
    return {
        "txnid": str(posted.get("txnid", "")),
        "status": str(posted.get("status", "")),
        "mihpayid": str(posted.get("mihpayid", "")),
        "amount": str(posted.get("amount", "")),
    }


async def _audit_payu_event(
    event_id: str, event_type: str, outcome: str, posted: dict
) -> None:
    """Append a PayU callback/webhook entry to ``payu_webhook_logs`` (service-role).

    Dedupe-safe: ``payu_event_id`` is UNIQUE, so a replay of the same event
    raises a duplicate which we swallow (the event is already recorded). A
    storage failure never propagates — auditing must not break result handling.
    Only the sanitized (PII/secret-free) snapshot is persisted.
    """
    try:
        await supabase.request(
            "POST",
            "rest/v1/payu_webhook_logs",
            service_role=True,
            json={
                "payu_event_id": event_id,
                "event_type": event_type,
                "outcome": outcome,
                "raw_payload": _audit_sanitize(posted),
            },
        )
    except Exception:
        logger.warning("Failed to write payu_webhook_logs audit entry", exc_info=True)


@router.post("/verify")
async def verify_payment(request: Request):
    """Handle a PayU payment-result callback (Req 8.1–8.6, 16.1).

    This is the browser-redirect callback from PayU after checkout. It is NOT a
    user-authenticated request — PayU does not carry the customer's token — so
    the **response hash is the authentication**: nothing is trusted or mutated
    until the hash verifies. Flow:

      1. Flag gate (Req 4.5) → ``ONLINE_PAYMENT_DISABLED`` when off.
      2. Read posted fields (form or JSON).
      3. Verify the response hash. Invalid/absent → ``PAYU_HASH_INVALID``,
         mutate nothing, record a ``rejected`` audit entry (Req 8.4).
      4. Look up the payment by ``payu_order_id == txnid`` (service-role).
      5. Idempotent: if the payment is already FINAL, acknowledge its current
         state without re-mutating (Req 8.6).
      6. Hash valid + PayU success → ``paid`` + ``settlement_status=pending``
         (Req 16.1) and confirm the booking (Req 8.2, 8.3).
      7. Hash valid + PayU failure → ``failed``; booking left unconfirmed
         (Req 8.5).

    Never logs the hash, email, firstname, or any other PII/secret.
    """
    # (1) Feature flag — fail closed (Req 4.5).
    if not payu_payouts_enabled():
        raise _err(
            403,
            "ONLINE_PAYMENT_DISABLED",
            "Online payments are currently unavailable.",
        )

    # (2) Read PayU's posted result (form-encoded on callback, or JSON).
    posted = await _read_posted_fields(request)
    # Normalise through the additive, permissive model (keeps unknown fields).
    parsed = PayuVerifyRequest(**posted)
    txnid = (parsed.txnid or "").strip()
    posted_status = (parsed.status or "").strip().lower()

    # (3) Verify the response hash BEFORE touching any state (Req 8.1).
    if not payu_service.verify_response_hash(posted):
        # Record the rejection in the audit log (Req 8.4). Derive a dedupe-safe
        # event id from the txnid; fall back to a random id when txnid is absent
        # so distinct bad callbacks are each recorded.
        reject_event_id = (
            f"callback:{txnid}:rejected" if txnid else f"callback:{uuid4().hex}:rejected"
        )
        await _audit_payu_event(reject_event_id, "callback", "rejected", posted)
        logger.warning("Rejected PayU callback: hash invalid or absent")
        raise _err(
            400,
            "PAYU_HASH_INVALID",
            "The payment result could not be verified.",
        )

    # (4) Look up the payment by PayU transaction id (service-role).
    payment_resp = await supabase.request(
        "GET",
        f"rest/v1/payments?payu_order_id=eq.{txnid}"
        "&select=id,booking_id,payment_status,settlement_status,amount_paise",
        service_role=True,
    )
    payment_rows = payment_resp.json() if payment_resp.status_code == 200 else []
    if not payment_rows:
        raise _err(404, "PAYMENT_NOT_FOUND", "No payment found for this transaction.")
    payment = payment_rows[0]
    payment_id = payment.get("id")
    booking_id = payment.get("booking_id")
    current_status = payment.get("payment_status")

    # (5) Idempotent acknowledgement (Req 8.6). If already FINAL, do not
    # re-mutate the payment or the booking — return its current state.
    if current_status in _FINAL_PAYMENT_STATUSES:
        return JSONResponse(
            status_code=200,
            content={
                "payment_id": payment_id,
                "booking_id": booking_id,
                "payment_status": current_status,
                "settlement_status": payment.get("settlement_status"),
                "idempotent": True,
            },
        )

    # Defensive amount tamper-check: PayU's signed amount must match the amount
    # we recorded when the order was created. The hash already covers the amount,
    # so a mismatch is a real anomaly — reject without mutating and audit it.
    try:
        posted_amount_paise = _rupees_to_paise(parsed.amount)
    except Exception:
        posted_amount_paise = None
    stored_amount_paise = payment.get("amount_paise")
    if (
        posted_amount_paise is not None
        and stored_amount_paise is not None
        and posted_amount_paise != int(stored_amount_paise)
    ):
        mismatch_event_id = (
            f"callback:{txnid}:amount_mismatch"
            if txnid
            else f"callback:{uuid4().hex}:amount_mismatch"
        )
        await _audit_payu_event(mismatch_event_id, "callback", "rejected", posted)
        logger.warning("Rejected PayU callback: amount mismatch for payment %s", payment_id)
        raise _err(
            400,
            "PAYU_AMOUNT_MISMATCH",
            "The payment amount did not match the expected amount.",
        )

    success = posted_status in _PAYU_SUCCESS_STATUSES

    if success:
        # (6) Verified success → payment paid, settlement pending (Req 8.2, 16.1).
        new_payment_status = "paid"
        update_payload = {
            "payment_status": new_payment_status,
            "settlement_status": "pending",
        }
        mihpayid = (parsed.mihpayid or "").strip()
        if mihpayid:
            update_payload["payu_payment_id"] = mihpayid
        await supabase.request(
            "PATCH",
            f"rest/v1/payments?id=eq.{payment_id}",
            service_role=True,
            json=update_payload,
        )
        # (Req 8.3) Confirm the linked booking — same column/value as bookings.py.
        if booking_id:
            await supabase.request(
                "PATCH",
                f"rest/v1/bookings?id=eq.{booking_id}",
                service_role=True,
                json={"status": "confirmed"},
            )
        outcome = "success"
        booking_status = "confirmed"
    else:
        # (7) Verified failure → payment failed; booking left untouched (Req 8.5).
        new_payment_status = "failed"
        await supabase.request(
            "PATCH",
            f"rest/v1/payments?id=eq.{payment_id}",
            service_role=True,
            json={"payment_status": new_payment_status},
        )
        outcome = "failed"
        booking_status = None

    # Record the processed result in the audit log (Req 8.4 / 10.5 style).
    processed_event_id = f"callback:{txnid}:{posted_status or 'unknown'}"
    await _audit_payu_event(processed_event_id, "callback", outcome, posted)

    return JSONResponse(
        status_code=200,
        content={
            "payment_id": payment_id,
            "booking_id": booking_id,
            "payment_status": new_payment_status,
            "settlement_status": "pending" if success else None,
            "booking_status": booking_status,
            "idempotent": False,
        },
    )

# ---------------------------------------------------------------------------
# Webhook helpers (Task 14 — server-to-server PayU events)
# ---------------------------------------------------------------------------


def _is_settlement_event(posted: dict) -> bool:
    """Detect a PayU settlement / payout webhook (Req 16.2, 16.3).

    TODO(PayU settlement webhook): PayU's exact settlement event shape is not
    yet confirmed — split settlement is still being activated on the account.
    We defensively detect a settlement event from either an explicit
    ``settlement_status`` field or an event-type field whose name references a
    settlement/payout. Until PayU confirms the contract, any event WITHOUT such
    a marker is treated as a normal payment-status event.
    """
    if posted.get("settlement_status"):
        return True
    event_type = str(posted.get("event") or posted.get("event_type") or "").lower()
    return "settle" in event_type or "payout" in event_type


def _settlement_outcome(posted: dict) -> Optional[str]:
    """Map a settlement event to ``'settled'`` / ``'failed'`` (Req 16.2, 16.3).

    Returns ``'settled'``, ``'failed'``, or ``None`` when the payload is
    indeterminate (in which case the settlement_status is left unchanged).

    TODO(PayU): confirm the exact field/value PayU sends for settled vs failed
    settlements; the value sets below are a defensive superset.
    """
    raw = str(
        posted.get("settlement_status") or posted.get("status") or ""
    ).strip().lower()
    if raw in ("settled", "completed", "success", "settlement_success", "credited"):
        return "settled"
    if raw in ("failed", "failure", "settlement_failed", "reversed"):
        return "failed"
    return None


async def _claim_webhook_event(event_id: str, event_type: str, posted: dict) -> str:
    """Claim a webhook event id by inserting a placeholder row FIRST (Req 10.4).

    Dedupe-by-insert: ``payu_event_id`` is UNIQUE, so a second delivery of the
    same event collides. Unlike ``_audit_payu_event`` (which silently swallows
    duplicates) we MUST detect the conflict here, so we inspect the status code.

    The placeholder is inserted with ``outcome = NULL`` — the table's CHECK
    constraint only rejects a non-null value outside the enum, so NULL is a
    valid "processing not yet finished" marker. The final outcome is written by
    ``_finalize_webhook_event`` after the state change succeeds. Only the
    PII/secret-free snapshot is persisted.

    Returns:
        ``"claimed"``   — fresh event; this request owns processing.
        ``"duplicate"`` — event id already present (409) → already processed.
        ``"error"``     — storage error / unexpected status; caller signals retry.
    """
    try:
        resp = await supabase.request(
            "POST",
            "rest/v1/payu_webhook_logs",
            service_role=True,
            json={
                "payu_event_id": event_id,
                "event_type": event_type,
                "outcome": None,
                "raw_payload": _audit_sanitize(posted),
            },
        )
    except Exception:
        logger.warning("Failed to claim PayU webhook event", exc_info=True)
        return "error"
    if resp.status_code in (200, 201):
        return "claimed"
    if resp.status_code == 409:
        return "duplicate"
    logger.warning(
        "Unexpected status %s claiming PayU webhook event", resp.status_code
    )
    return "error"


async def _release_webhook_event(event_id: str) -> None:
    """Delete the placeholder row so a PayU retry can reprocess (Req 10.6).

    Called only when processing of a valid, freshly-claimed webhook fails. By
    removing the (unique) event id we leave the event UNPROCESSED, so PayU's
    retry re-inserts and re-runs it instead of being permanently deduped.
    """
    try:
        await supabase.request(
            "DELETE",
            f"rest/v1/payu_webhook_logs?payu_event_id=eq.{event_id}",
            service_role=True,
        )
    except Exception:
        logger.warning("Failed to release PayU webhook event for retry", exc_info=True)


async def _finalize_webhook_event(event_id: str, outcome: str) -> None:
    """Write the final processing outcome on the claimed row (Req 10.5)."""
    try:
        await supabase.request(
            "PATCH",
            f"rest/v1/payu_webhook_logs?payu_event_id=eq.{event_id}",
            service_role=True,
            json={"outcome": outcome},
        )
    except Exception:
        logger.warning("Failed to finalize PayU webhook outcome", exc_info=True)


async def _process_webhook_event(
    posted: dict, txnid: str, mihpayid: str, status_val: str, settlement: bool
) -> dict:
    """Apply a fresh, hash-valid PayU webhook to payment / booking state.

    Mirrors the verify (callback) mutation pattern but is the AUTHORITATIVE
    server-to-server path: it confirms the booking independently of whether the
    browser callback completed (Req 8.7). Raises on a Supabase failure so the
    caller can release the event id for a PayU retry (Req 10.6).
    """
    # Look up the payment by PayU transaction id (service-role).
    payment_resp = await supabase.request(
        "GET",
        f"rest/v1/payments?payu_order_id=eq.{txnid}"
        "&select=id,booking_id,payment_status,settlement_status,amount_paise",
        service_role=True,
    )
    payment_rows = payment_resp.json() if payment_resp.status_code == 200 else []
    if not payment_rows:
        # No matching payment. Nothing to mutate; the event is acknowledged so
        # PayU stops retrying (a stray/unknown txnid is not an error here).
        return {"payment_found": False}
    payment = payment_rows[0]
    payment_id = payment.get("id")
    booking_id = payment.get("booking_id")
    current_status = payment.get("payment_status")

    # Settlement event (Req 16.2, 16.3) — only the settlement_status changes;
    # payment_status and booking are untouched.
    if settlement:
        outcome = _settlement_outcome(posted)
        if outcome == "settled":
            await supabase.request(
                "PATCH",
                f"rest/v1/payments?id=eq.{payment_id}",
                service_role=True,
                json={"settlement_status": "settled"},
            )
            return {"payment_id": payment_id, "settlement_status": "settled"}
        if outcome == "failed":
            await supabase.request(
                "PATCH",
                f"rest/v1/payments?id=eq.{payment_id}",
                service_role=True,
                json={"settlement_status": "failed"},
            )
            # Req 16.3: flag for Admin reconciliation. No secrets/PII logged.
            logger.warning(
                "PayU settlement FAILED for payment %s — flagged for reconciliation",
                payment_id,
            )
            return {"payment_id": payment_id, "settlement_status": "failed"}
        # Indeterminate settlement payload → leave settlement_status unchanged.
        return {
            "payment_id": payment_id,
            "settlement_status": payment.get("settlement_status"),
        }

    # Payment-status event. Idempotent: if already FINAL, do not re-mutate the
    # payment or the booking (Req 8.6) — e.g. verify already confirmed it.
    if current_status in _FINAL_PAYMENT_STATUSES:
        return {
            "payment_id": payment_id,
            "payment_status": current_status,
            "idempotent": True,
        }

    success = status_val in _PAYU_SUCCESS_STATUSES
    if success:
        # Verified success → paid + settlement pending (Req 16.1) and confirm
        # the booking independently of the browser callback (Req 8.7).
        update_payload: dict[str, Any] = {
            "payment_status": "paid",
            "settlement_status": "pending",
        }
        if mihpayid:
            update_payload["payu_payment_id"] = mihpayid
        await supabase.request(
            "PATCH",
            f"rest/v1/payments?id=eq.{payment_id}",
            service_role=True,
            json=update_payload,
        )
        if booking_id:
            await supabase.request(
                "PATCH",
                f"rest/v1/bookings?id=eq.{booking_id}",
                service_role=True,
                json={"status": "confirmed"},
            )
        return {
            "payment_id": payment_id,
            "payment_status": "paid",
            "settlement_status": "pending",
            "booking_status": "confirmed",
        }

    # Verified failure → payment failed; booking left untouched (Req 8.5).
    await supabase.request(
        "PATCH",
        f"rest/v1/payments?id=eq.{payment_id}",
        service_role=True,
        json={"payment_status": "failed"},
    )
    return {
        "payment_id": payment_id,
        "payment_status": "failed",
        "booking_status": None,
    }


@router.post("/webhook")
async def payu_webhook(request: Request):
    """Handle a PayU server-to-server webhook (Req 8.7, 10.1–10.6, 16.2, 16.3).

    This is the AUTHORITATIVE confirmation path. It confirms the booking
    independently of whether the browser ``/payments/verify`` callback ran
    (Req 8.7). It is NOT user-authenticated — the webhook hash is the
    authentication. Flow:

      1. Flag gate (Req 4.x): while OFF we simply acknowledge ``ignored`` 200
         and do nothing. We do NOT 403 a webhook — a non-2xx would make PayU
         retry in a storm; a benign 200 ack keeps PayU quiet while the feature
         is dark.
      2. Read posted fields (form or JSON) via ``_read_posted_fields``.
      3. Verify the webhook hash (Req 10.1). Invalid/absent → record a
         ``rejected`` audit entry, mutate NOTHING, return 400 (Req 10.2).
      4. Acknowledge fast (Req 10.3): processing is minimal and synchronous.
      5. Dedupe by a deterministic event id via insert-first (Req 10.4): a
         unique-constraint conflict (409) means the event was already processed
         → acknowledge without reprocessing and without changing state.
      6. Fresh event → confirm/fail the payment + booking, or update the
         settlement status (Req 8.7, 16.1, 16.2, 16.3).
      7. Record the processing outcome (Req 10.5). If processing of a valid
         webhook fails, the placeholder row is DELETED so the event id is left
         unprocessed and a PayU retry can reprocess it (Req 10.6); we return a
         non-2xx so PayU retries.

    Never logs the hash, email, firstname, or any other PII/secret.
    """
    # (1) Feature flag — acknowledge and do nothing while OFF (avoid PayU retry
    # storms while the feature is dark). No DB/PayU contact.
    if not payu_payouts_enabled():
        return JSONResponse(status_code=200, content={"status": "ignored"})

    # (2) Read PayU's posted event (form-encoded server-to-server, or JSON).
    posted = await _read_posted_fields(request)
    txnid = str(posted.get("txnid", "")).strip()
    mihpayid = str(posted.get("mihpayid", "")).strip()
    status_val = str(posted.get("status", "")).strip().lower()

    # (3) Verify the webhook hash BEFORE touching any state (Req 10.1, 10.2).
    if not payu_service.verify_webhook(posted):
        reject_event_id = (
            f"webhook:{mihpayid or txnid}:rejected"
            if (mihpayid or txnid)
            else f"webhook:{uuid4().hex}:rejected"
        )
        await _audit_payu_event(reject_event_id, "webhook", "rejected", posted)
        logger.warning("Rejected PayU webhook: hash invalid or absent")
        raise _err(400, "PAYU_HASH_INVALID", "The webhook could not be verified.")

    # (5) Dedupe by a deterministic event id (Req 10.4). Prefer mihpayid (the
    # PayU-side payment id), fall back to txnid; include the status so a
    # payment event and its later settlement event are distinct claims.
    settlement = _is_settlement_event(posted)
    event_type = "settlement" if settlement else "webhook"
    event_id = (
        f"webhook:{mihpayid or txnid}:{status_val or 'unknown'}"
        if (mihpayid or txnid)
        else f"webhook:{uuid4().hex}:{status_val or 'unknown'}"
    )
    claimed = await _claim_webhook_event(event_id, event_type, posted)
    if claimed == "duplicate":
        # Already processed → acknowledge without reprocessing / re-mutating.
        return JSONResponse(
            status_code=200, content={"status": "ok", "duplicate": True}
        )
    if claimed == "error":
        # Could not record the claim — do NOT mutate state on an unrecorded
        # event; signal a retry so PayU re-delivers (Req 10.6).
        raise _err(503, "WEBHOOK_LOG_FAILED", "Could not record the webhook.")

    # (6) Fresh, hash-valid event — process synchronously and quickly (Req 10.3).
    # On ANY failure, release the event id so a PayU retry can reprocess it and
    # leave affected state unchanged for this attempt (Req 10.6).
    try:
        result = await _process_webhook_event(
            posted, txnid, mihpayid, status_val, settlement
        )
    except Exception:
        logger.warning(
            "PayU webhook processing failed; releasing event for retry",
            exc_info=True,
        )
        await _release_webhook_event(event_id)
        raise _err(
            500, "WEBHOOK_PROCESSING_FAILED", "The webhook could not be processed."
        )

    # (7) Record the successful processing outcome (Req 10.5).
    await _finalize_webhook_event(event_id, "success")
    return JSONResponse(status_code=200, content={"status": "ok", **result})

# ---------------------------------------------------------------------------
# Status (Task 15 — caller-scoped payment + settlement status, Req 9.1/9.2/9.5/12.1)
# ---------------------------------------------------------------------------

# Payment statuses from which a customer is allowed to retry (Req 9.5). A paid
# payment is never retryable; only a failed (or pending-then-expired) attempt is.
_RETRYABLE_PAYMENT_STATUSES = frozenset({"failed", "pending-expired", "expired"})


def _derive_can_retry(payment_status: Optional[str], attempt_count: Any) -> bool:
    """Server-derived retry eligibility for a booking's payment (Req 9.5).

    ``True`` only when ALL hold:
      * the payment is NOT ``paid`` (a paid booking is never re-charged), and
      * the payment_status is retryable (``failed`` / pending-expired), and
      * fewer than the max attempts have been used (``attempt_count < 3``).

    The retry itself is enforced by ``POST /payments/create-order`` (Task 12),
    which independently caps attempts at 3 — this flag is only a UX hint so the
    client can show a "Retry payment" affordance (Req 9.1, 9.2).
    """
    if payment_status == "paid":
        return False
    if payment_status not in _RETRYABLE_PAYMENT_STATUSES:
        return False
    try:
        count = int(attempt_count) if attempt_count is not None else 0
    except (TypeError, ValueError):
        count = 0
    return count < _MAX_PAYMENT_ATTEMPTS


@router.get("/status")
async def get_payment_status(
    order_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Return the caller's payment + settlement status for a booking/order.

    Look up by ``booking_id`` OR ``order_id`` (the PayU transaction id /
    ``payu_order_id``). ``order_id`` is kept for backwards compatibility with the
    previous stub (which accepted only ``order_id``); ``booking_id`` is the new,
    additive lookup. At least one is required, else ``400 MISSING_QUERY``.

    Caller-scoped (Req 12.1): the lookup is filtered by ``user_id == current_user``
    at the database level, so a payment that belongs to another user is never
    returned and its existence is never revealed.

    Backwards-compatibility decision: the old stub returned ``200 {"status":
    "unknown"}`` for any order. To avoid breaking old Play Store builds that may
    poll this endpoint, we KEEP that contract — when no payment owned by the
    caller matches (none found, or one exists but is owned by someone else), we
    return ``200 {"status": "unknown"}`` rather than a 404. This both preserves
    the legacy shape and avoids leaking another user's data.

    Flag decision: this is a read-only endpoint and exposes nothing sensitive, so
    it is intentionally NOT gated by ``PAYU_PAYOUTS_ENABLED`` — clients polling a
    payment's status keep working regardless of the flag, and tenancy scoping
    still guarantees a caller only ever sees their own payment.
    """
    user_id = current_user.get("id")

    # At least one selector is required (Req: structured MISSING_QUERY).
    if not booking_id and not order_id:
        raise _err(
            400,
            "MISSING_QUERY",
            "Provide a booking_id or order_id to look up payment status.",
        )

    # Build the caller-scoped lookup. Filtering by user_id at the DB layer means
    # an un-owned payment simply does not match → it can never be returned or
    # its existence revealed (Req 12.1). booking_id takes precedence when both
    # are supplied. Most-recent first so a retry's latest attempt wins.
    if booking_id:
        selector = f"&booking_id=eq.{booking_id}"
    else:
        selector = f"&payu_order_id=eq.{order_id}"
    status_resp = await supabase.request(
        "GET",
        f"rest/v1/payments?user_id=eq.{user_id}{selector}"
        "&select=payment_status,settlement_status,booking_id,amount_paise,attempt_count"
        "&order=created_at.desc&limit=1",
        service_role=True,
    )
    rows = status_resp.json() if status_resp.status_code == 200 else []
    if not rows:
        # No payment owned by this caller matches. Keep the legacy 200 / unknown
        # contract (see docstring) so old clients never break.
        return {"status": "unknown"}

    payment = rows[0]
    payment_status = payment.get("payment_status")
    return {
        "payment_status": payment_status,
        "settlement_status": payment.get("settlement_status"),
        "booking_id": payment.get("booking_id"),
        "amount_paise": payment.get("amount_paise"),
        "attempt_count": payment.get("attempt_count"),
        "can_retry": _derive_can_retry(payment_status, payment.get("attempt_count")),
    }


# ---------------------------------------------------------------------------
# Refund (Task 16 — full/partial, idempotent, flag-gated, Req 11, 13.6/13.7)
# ---------------------------------------------------------------------------
#
# SCOPE NOTE (spec Non-Goal #8): this endpoint targets pre-settlement refunds
# and refunds PayU natively supports. Full refund-AFTER-settlement clawback
# (recovering funds already paid out to the salon) is explicitly out of scope
# for this feature and deferred to a later one.

# Refund statuses that consume the captured amount when computing how much is
# still refundable (Req 11.2): everything except a `failed` refund. A failed
# refund frees its amount again.
_REFUND_IN_PROGRESS_STATUSES = frozenset({"initiated", "processing", "completed"})
# Payment statuses a refund may be initiated against (Req 11.4, 11.5): a paid
# payment, or one already partially refunded with remaining captured amount.
_REFUNDABLE_PAYMENT_STATUSES = frozenset({"paid", "partially_refunded"})


def _normalize_refund_result(result: Any) -> tuple[bool, str, Optional[str]]:
    """Map a ``payu_service.create_refund`` result to (success, status, refund_id).

    The PayU merchant-refund contract is not fully confirmed (see
    ``services/payu_service.create_refund`` TODO), so this is defensive:

      * ``failed`` / ``failure`` / ``error`` (or a non-dict result) → refund
        FAILED (Req 11.9).
      * ``completed`` / ``success`` / ``refunded`` / ``settled`` → COMPLETED;
        the payment status is updated now (Req 11.4, 11.5).
      * anything else PayU accepted (``initiated`` / ``processing`` /
        ``pending``) → PROCESSING; the payment status is left unchanged until a
        later webhook/settlement confirms the refund (documented assumption).

    Returns ``(success, refund_status, payu_refund_id)``.
    """
    if not isinstance(result, dict):
        return False, "failed", None
    raw_status = str(result.get("refund_status") or result.get("status") or "").strip().lower()
    payu_refund_id = (
        result.get("payu_refund_id")
        or result.get("refund_id")
        or result.get("request_id")
    )
    payu_refund_id = str(payu_refund_id) if payu_refund_id else None
    if raw_status in ("failed", "failure", "error", ""):
        # An empty/unknown status from a returned (non-exception) call is treated
        # as a failure so we never silently leave a refund half-applied.
        return False, "failed", payu_refund_id
    if raw_status in ("completed", "success", "refunded", "settled"):
        return True, "completed", payu_refund_id
    # initiated / processing / pending → async; confirmation arrives later.
    return True, "processing", payu_refund_id


@router.post("/refund")
@limiter.limit("10/minute")
async def create_refund_endpoint(
    request: Request,
    data: RefundCreate,
    current_user: dict = Depends(get_current_user),
):
    """Initiate a full or partial refund for a captured payment (Req 11, 13.6/13.7).

    Guard order: flag ON → Idempotency-Key present (replay/conflict) → payment
    loaded → caller authorized → payment refundable → amount within the
    remaining captured amount. Only then is a refund row created and PayU asked
    to refund. On PayU failure the refund row is marked ``failed`` and the
    payment status is left untouched (Req 11.9).

    Authorization model (kept simple but enforced): the caller must be EITHER
    the customer who owns the payment (``payment.user_id == current_user.id``)
    OR the owner of the payment's salon (``salons.owner_id == current_user.id``).
    TODO(owner/admin triggers): the spec also allows an Admin-initiated refund
    (Req 11.1); a dedicated admin-token path is deferred — for now an Admin who
    is not the salon owner is not separately recognised here.
    """
    # (1) Feature flag — fail closed (Req 4.5). No refund row, no PayU contact.
    if not payu_payouts_enabled():
        raise _err(
            403,
            "ONLINE_PAYMENT_DISABLED",
            "Online payments are currently unavailable.",
        )

    user_id = current_user.get("id")
    path = request.url.path

    # (2) Idempotency-Key required (Req 11.7, 11.8, 13.6).
    idempotency_key = request.headers.get("Idempotency-Key")
    if not idempotency_key or not (
        1 <= len(idempotency_key) <= _IDEMPOTENCY_KEY_MAX_LEN
    ):
        raise _err(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "An Idempotency-Key header (1-255 chars) is required for this request.",
        )

    # Idempotent replay / conflict (Req 13.7). Same key + same payment → return
    # the stored result; same key + different payment → conflict.
    stored = await _idempotency_lookup(user_id, idempotency_key, path)
    if stored:
        stored_body = stored.get("response_body") or {}
        if str(stored_body.get("payment_id")) == str(data.payment_id):
            return JSONResponse(
                status_code=stored.get("response_status", 200),
                content=stored_body,
                headers={"X-Idempotency-Hit": "true"},
            )
        raise _err(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This Idempotency-Key was already used for a different payment.",
        )

    # (3) Load the payment (service-role).
    payment_resp = await supabase.request(
        "GET",
        f"rest/v1/payments?id=eq.{data.payment_id}"
        "&select=id,user_id,salon_id,payment_status,payu_payment_id,payu_order_id,amount_paise",
        service_role=True,
    )
    payment_rows = payment_resp.json() if payment_resp.status_code == 200 else []
    if not payment_rows:
        raise _err(404, "PAYMENT_NOT_FOUND", "Payment not found.")
    payment = payment_rows[0]
    payment_id = payment.get("id")
    salon_id = payment.get("salon_id")

    # (4) Authorize: customer who owns the payment OR owner of the payment's
    # salon. Only look up the salon owner when the caller is NOT the customer
    # (keeps the common customer path to a single DB read).
    authorized = str(payment.get("user_id")) == str(user_id)
    if not authorized and salon_id:
        salon_resp = await supabase.request(
            "GET",
            f"rest/v1/salons?id=eq.{salon_id}&select=owner_id",
            service_role=True,
        )
        salon_rows = salon_resp.json() if salon_resp.status_code == 200 else []
        if salon_rows and str(salon_rows[0].get("owner_id")) == str(user_id):
            authorized = True
    if not authorized:
        raise _err(403, "REFUND_FORBIDDEN", "You are not allowed to refund this payment.")

    # (5) Payment must be refundable (Req 11.4, 11.5). A pending/failed/fully
    # refunded payment cannot be refunded.
    if payment.get("payment_status") not in _REFUNDABLE_PAYMENT_STATUSES:
        raise _err(
            400,
            "REFUND_NOT_ALLOWED",
            "This payment cannot be refunded in its current state.",
        )

    captured_paise = int(payment.get("amount_paise") or 0)

    # (6) Sum prior refunds to find the remaining refundable amount (Req 11.2).
    # In-progress + completed refunds consume the captured amount; failed ones
    # do not. ``completed`` refunds also drive the payment-status transition.
    refunds_resp = await supabase.request(
        "GET",
        f"rest/v1/refunds?payment_id=eq.{data.payment_id}"
        "&select=amount_paise,refund_status",
        service_role=True,
    )
    refund_rows = refunds_resp.json() if refunds_resp.status_code == 200 else []
    already_refunded = 0
    already_completed = 0
    for row in refund_rows:
        status_val = str(row.get("refund_status") or "").strip().lower()
        amt = int(row.get("amount_paise") or 0)
        if status_val in _REFUND_IN_PROGRESS_STATUSES:
            already_refunded += amt
        if status_val == "completed":
            already_completed += amt

    remaining = captured_paise - already_refunded

    # (7) Determine + validate the refund amount (Req 11.2, 11.3). ``None`` →
    # full remaining; otherwise the supplied paise must be 1..remaining.
    if data.amount_paise is None:
        refund_amount = remaining
    else:
        refund_amount = int(data.amount_paise)
    if refund_amount < 1 or remaining < 1:
        raise _err(
            400,
            "REFUND_AMOUNT_EXCEEDS",
            "No refundable amount remains for this payment.",
        )
    if refund_amount > remaining:
        raise _err(
            400,
            "REFUND_AMOUNT_EXCEEDS",
            "The refund amount exceeds the remaining refundable amount.",
        )

    # (8) Create the refund row in ``initiated`` (Req 11.1) BEFORE contacting
    # PayU, so a PayU failure still leaves an auditable record to reconcile.
    create_refund_resp = await supabase.request(
        "POST",
        "rest/v1/refunds",
        service_role=True,
        json={
            "payment_id": payment_id,
            "amount_paise": refund_amount,
            "refund_status": "initiated",
            "reason": data.reason,
        },
    )
    if create_refund_resp.status_code not in (200, 201):
        logger.error("Failed to create refund row for payment %s", payment_id)
        raise _err(500, "REFUND_CREATE_FAILED", "Could not create the refund.")
    created_refund_rows = create_refund_resp.json()
    refund_id = created_refund_rows[0]["id"] if created_refund_rows else None

    # (9) Ask PayU to refund. The service never raises on transport errors (it
    # returns a structured dict), but we still guard against an unexpected
    # exception. On failure → mark refund ``failed``, keep payment status
    # unchanged, return 502 (Req 11.9).
    try:
        payu_result = await payu_service.create_refund(
            payment.get("payu_payment_id"),
            refund_amount,
            payment.get("payu_order_id"),
        )
    except Exception:
        logger.warning("PayU refund call raised for payment %s", payment_id, exc_info=True)
        payu_result = None

    success, refund_status, payu_refund_id = _normalize_refund_result(payu_result)

    if not success:
        await supabase.request(
            "PATCH",
            f"rest/v1/refunds?id=eq.{refund_id}",
            service_role=True,
            json={"refund_status": "failed"},
        )
        raise _err(
            502,
            "REFUND_FAILED",
            "The refund could not be processed by the payment provider.",
        )

    # (10) PayU accepted the refund. Persist the resolved status + PayU refund id.
    refund_update: dict[str, Any] = {"refund_status": refund_status}
    if payu_refund_id:
        refund_update["payu_refund_id"] = payu_refund_id
    await supabase.request(
        "PATCH",
        f"rest/v1/refunds?id=eq.{refund_id}",
        service_role=True,
        json=refund_update,
    )

    # (11) Update the payment status ONLY when the refund is confirmed complete
    # (Req 11.4, 11.5). An async ``processing`` refund leaves the payment status
    # as-is until a webhook/settlement confirms it (documented assumption).
    payment_status = payment.get("payment_status")
    if refund_status == "completed":
        total_completed = already_completed + refund_amount
        if total_completed >= captured_paise:
            payment_status = "refunded"
        elif total_completed > 0:
            payment_status = "partially_refunded"
        if payment_status != payment.get("payment_status"):
            await supabase.request(
                "PATCH",
                f"rest/v1/payments?id=eq.{payment_id}",
                service_role=True,
                json={"payment_status": payment_status},
            )

    result = {
        "refund_id": refund_id,
        "refund_status": refund_status,
        "payment_status": payment_status,
        "amount_paise": refund_amount,
    }

    # Store for idempotent replay (Req 13.7).
    await _idempotency_store(user_id, idempotency_key, path, 200, result)

    return JSONResponse(status_code=200, content=result)
