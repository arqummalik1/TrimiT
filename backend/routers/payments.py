"""Payments router — UPI-intent initiation + manual salon verification (v1).

TrimiT never collects customer money. Two flows live here:

  Customer
  --------
  * ``POST /payments/upi/initiate`` — generate + persist a booking reference and
    return the UPI-intent params for the customer's UPI app. The client launches
    the UPI app via its own native UPIIntentService (UI → ViewModel → repository
    → UPI Intent Service → launcher). Returning from the UPI app does NOT mean
    success, so this never reports "paid".
  * ``POST /payments/upi/awaiting-verification`` — the customer returned from the
    UPI app; flip the payment to ``waiting_verification`` and notify the salon.

  Salon owner
  -----------
  * ``POST /payments/{booking_id}/verify`` — SINGLE action that verifies the
    payment AND confirms the booking atomically (one tap for the owner). Payment
    and booking statuses are kept separate internally.
  * ``POST /payments/{booking_id}/reject`` — the salon could not find the
    payment; mark it rejected so the customer can retry or contact the salon.

  Both
  ----
  * ``GET /payments/{booking_id}/status`` — caller-scoped payment + booking
    status for polling/UI.

Booking-engine independence: this router only ever PATCHes the payment columns
(and, on verify, the booking ``status``); all capacity/atomicity rules stay in
the booking RPC. Payment provider specifics live behind ``services.payments``.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from core.limiter import limiter
from core.supabase import supabase
from dependencies.auth import get_current_user
from models.payments import (
    PaymentVerificationAction,
    UpiAwaitVerificationRequest,
    UpiInitiateRequest,
)
from services import booking_push
from services.payments import (
    PaymentMethod,
    PaymentVerificationStatus,
    generate_booking_reference,
    get_payment_provider,
)

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/payments", tags=["Payments"])

# Booking embed used by every handler here.
_BOOKING_SELECT = (
    "id,user_id,salon_id,amount,status,payment_method,payment_status,"
    "payment_verification_status,booking_reference,expected_upi_id,"
    "booking_date,time_slot,verified_by,"
    "salons(id,owner_id,name,upi_id),services(name)"
)

_WAITING_MESSAGE = (
    "We are waiting for the salon to verify your payment. "
    "Most salons verify payments within 2–5 minutes."
)


def _err(status_code: int, code: str, message: str) -> HTTPException:
    """Structured ``{code, message}`` error (wrapped by core.exceptions)."""
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


def _embed_one(value) -> dict:
    """PostgREST embeds may be a dict or a 1-element list; normalise to dict."""
    if isinstance(value, list):
        return value[0] if value else {}
    return value or {}


async def _load_booking(booking_id: str) -> dict:
    """Fetch a booking (service-role) or raise a structured 404."""
    resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{booking_id}&select={_BOOKING_SELECT}",
        service_role=True,
    )
    rows = resp.json() if resp.status_code == 200 else []
    if not rows:
        raise _err(404, "BOOKING_NOT_FOUND", "Booking not found.")
    return rows[0]


async def _service_name(booking: dict) -> str:
    return str(_embed_one(booking.get("services")).get("name") or "your service")


# ---------------------------------------------------------------------------
# Customer — initiate a UPI payment
# ---------------------------------------------------------------------------
@router.post("/upi/initiate")
@limiter.limit("20/minute")
async def initiate_upi_payment(
    request: Request,
    data: UpiInitiateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate/persist a booking reference and return UPI-intent params.

    Idempotent: re-initiating reuses the existing booking reference instead of
    creating a new one, so a retry never spawns a duplicate reference.
    """
    user_id = current_user.get("id")
    booking = await _load_booking(data.booking_id)

    if str(booking.get("user_id")) != str(user_id):
        raise _err(403, "BOOKING_FORBIDDEN", "This booking does not belong to you.")

    if str(booking.get("payment_method")) != PaymentMethod.upi.value:
        raise _err(400, "NOT_A_UPI_BOOKING", "This booking is not a UPI payment.")

    if booking.get("payment_verification_status") == PaymentVerificationStatus.verified.value:
        raise _err(409, "PAYMENT_ALREADY_VERIFIED", "This payment is already verified.")

    salon = _embed_one(booking.get("salons"))
    provider = get_payment_provider(PaymentMethod.upi.value)

    # Reuse an existing reference (idempotent retry); otherwise generate one.
    booking_reference = booking.get("booking_reference") or generate_booking_reference()

    intent = provider.build_upi_intent(
        salon=salon,
        amount=booking.get("amount"),
        booking_reference=booking_reference,
    )
    if intent is None:
        raise _err(
            409,
            "SALON_UPI_UNAVAILABLE",
            "This salon has not set up a UPI ID yet. Please choose cash at salon.",
        )

    # Persist the reference, expected UPI id, and mark the payment initiated.
    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{data.booking_id}",
        service_role=True,
        json={
            "booking_reference": booking_reference,
            "expected_upi_id": intent.payee_vpa,
            "payment_verification_status": PaymentVerificationStatus.initiated.value,
        },
    )
    if patch.status_code not in (200, 204):
        logger.error("[UPI] initiate persist failed booking_id=%s", data.booking_id)
        raise _err(500, "PAYMENT_INITIATE_FAILED", "Could not start the payment.")

    return JSONResponse(
        status_code=200,
        content={
            "booking_id": data.booking_id,
            "booking_reference": booking_reference,
            "payment_verification_status": PaymentVerificationStatus.initiated.value,
            "upi": intent.to_dict(),
            "message": _WAITING_MESSAGE,
        },
    )


# ---------------------------------------------------------------------------
# Customer — returned from the UPI app (paid or not — we cannot know)
# ---------------------------------------------------------------------------
@router.post("/upi/awaiting-verification")
@limiter.limit("20/minute")
async def mark_awaiting_verification(
    request: Request,
    data: UpiAwaitVerificationRequest,
    current_user: dict = Depends(get_current_user),
):
    """Flip a UPI payment to ``waiting_verification`` and notify the salon.

    NEVER returns a success/paid signal — the customer is always told we are
    waiting for the salon to verify.
    """
    user_id = current_user.get("id")
    booking = await _load_booking(data.booking_id)

    if str(booking.get("user_id")) != str(user_id):
        raise _err(403, "BOOKING_FORBIDDEN", "This booking does not belong to you.")

    if str(booking.get("payment_method")) != PaymentMethod.upi.value:
        raise _err(400, "NOT_A_UPI_BOOKING", "This booking is not a UPI payment.")

    current = booking.get("payment_verification_status")
    if current == PaymentVerificationStatus.verified.value:
        raise _err(409, "PAYMENT_ALREADY_VERIFIED", "This payment is already verified.")

    # Only move forward from initiated/timeout into waiting_verification. If the
    # owner already rejected, a re-submission re-enters the queue.
    new_status = PaymentVerificationStatus.waiting_verification.value
    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{data.booking_id}",
        service_role=True,
        json={"payment_verification_status": new_status},
    )
    if patch.status_code not in (200, 204):
        logger.error("[UPI] awaiting persist failed booking_id=%s", data.booking_id)
        raise _err(500, "PAYMENT_UPDATE_FAILED", "Could not update the payment.")

    try:
        salon = _embed_one(booking.get("salons"))
        customer_name = await booking_push.fetch_user_name(user_id)
        await booking_push.after_upi_awaiting_verification(
            booking_id=data.booking_id,
            owner_id=salon.get("owner_id"),
            customer_id=user_id,
            customer_name=customer_name,
            service_name=await _service_name(booking),
            amount=float(booking.get("amount") or 0),
            booking_reference=str(booking.get("booking_reference") or ""),
        )
    except Exception as exc:  # notifications must never break the flow
        logger.error("[UPI] awaiting push failed booking_id=%s err=%s", data.booking_id, exc)

    return {
        "booking_id": data.booking_id,
        "payment_verification_status": new_status,
        "message": _WAITING_MESSAGE,
    }


# ---------------------------------------------------------------------------
# Owner authorization helper
# ---------------------------------------------------------------------------
async def _require_booking_owner(booking: dict, current_user: dict) -> None:
    """Raise unless the caller is an owner who owns this booking's salon."""
    profile = current_user.get("profile") or {}
    if profile.get("role") != "owner":
        raise _err(403, "FORBIDDEN_NOT_OWNER", "Only salon owners can verify payments.")
    salon = _embed_one(booking.get("salons"))
    if str(salon.get("owner_id")) != str(current_user.get("id")):
        raise _err(403, "FORBIDDEN_NOT_SALON_OWNER", "You do not own this salon.")


# ---------------------------------------------------------------------------
# Owner — single action: verify payment AND confirm booking
# ---------------------------------------------------------------------------
@router.post("/{booking_id}/verify")
@limiter.limit("30/minute")
async def verify_payment(
    request: Request,
    booking_id: str,
    body: PaymentVerificationAction = PaymentVerificationAction(),
    current_user: dict = Depends(get_current_user),
):
    """Owner verifies the UPI payment, confirming the booking in one operation.

    Payment status and booking status stay separate internally
    (``payment_verification_status='verified'`` + ``payment_status='paid'`` +
    booking ``status='confirmed'``), but the owner sees a single "Verify" action.
    Idempotent: verifying an already-verified payment returns the same result.
    """
    booking = await _load_booking(booking_id)
    await _require_booking_owner(booking, current_user)

    if str(booking.get("payment_method")) != PaymentMethod.upi.value:
        raise _err(400, "NOT_A_UPI_BOOKING", "Only UPI payments need verification.")

    # Idempotent: already verified → return current state without re-mutating.
    if booking.get("payment_verification_status") == PaymentVerificationStatus.verified.value:
        return {
            "booking_id": booking_id,
            "payment_verification_status": PaymentVerificationStatus.verified.value,
            "booking_status": booking.get("status"),
            "idempotent": True,
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{booking_id}",
        service_role=True,
        json={
            "payment_verification_status": PaymentVerificationStatus.verified.value,
            "payment_status": "paid",
            "status": "confirmed",
            "verified_at": now_iso,
            "verified_by": current_user.get("id"),
            "verification_notes": body.notes,
        },
    )
    if patch.status_code not in (200, 204):
        logger.error("[UPI] verify persist failed booking_id=%s", booking_id)
        raise _err(500, "PAYMENT_VERIFY_FAILED", "Could not verify the payment.")

    try:
        await booking_push.after_payment_confirmed(
            booking_id=booking_id,
            customer_id=booking.get("user_id"),
            service_name=await _service_name(booking),
            booking_date=str(booking.get("booking_date") or ""),
            time_slot=str(booking.get("time_slot") or ""),
        )
    except Exception as exc:
        logger.error("[UPI] verify push failed booking_id=%s err=%s", booking_id, exc)

    return {
        "booking_id": booking_id,
        "payment_verification_status": PaymentVerificationStatus.verified.value,
        "payment_status": "paid",
        "booking_status": "confirmed",
        "idempotent": False,
    }


# ---------------------------------------------------------------------------
# Owner — reject a UPI payment (could not find it)
# ---------------------------------------------------------------------------
@router.post("/{booking_id}/reject")
@limiter.limit("30/minute")
async def reject_payment(
    request: Request,
    booking_id: str,
    body: PaymentVerificationAction = PaymentVerificationAction(),
    current_user: dict = Depends(get_current_user),
):
    """Owner rejects the UPI payment. The booking stays pending so the customer
    can retry (re-initiate) or contact the salon. Never auto-cancels.
    """
    booking = await _load_booking(booking_id)
    await _require_booking_owner(booking, current_user)

    if str(booking.get("payment_method")) != PaymentMethod.upi.value:
        raise _err(400, "NOT_A_UPI_BOOKING", "Only UPI payments can be rejected here.")

    if booking.get("payment_verification_status") == PaymentVerificationStatus.verified.value:
        raise _err(409, "PAYMENT_ALREADY_VERIFIED", "This payment is already verified.")

    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{booking_id}",
        service_role=True,
        json={
            "payment_verification_status": PaymentVerificationStatus.rejected.value,
            "verification_notes": body.notes,
        },
    )
    if patch.status_code not in (200, 204):
        logger.error("[UPI] reject persist failed booking_id=%s", booking_id)
        raise _err(500, "PAYMENT_REJECT_FAILED", "Could not reject the payment.")

    try:
        await booking_push.after_payment_rejected(
            booking_id=booking_id,
            customer_id=booking.get("user_id"),
            service_name=await _service_name(booking),
        )
    except Exception as exc:
        logger.error("[UPI] reject push failed booking_id=%s err=%s", booking_id, exc)

    return {
        "booking_id": booking_id,
        "payment_verification_status": PaymentVerificationStatus.rejected.value,
        "booking_status": booking.get("status"),
    }


# ---------------------------------------------------------------------------
# Both — caller-scoped payment + booking status (for polling/UI)
# ---------------------------------------------------------------------------
@router.get("/{booking_id}/status")
async def get_payment_status(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return payment + booking status. Scoped to the booking's customer or the
    salon owner; anyone else gets 403 and never sees the data.
    """
    booking = await _load_booking(booking_id)
    user_id = str(current_user.get("id"))
    salon = _embed_one(booking.get("salons"))
    is_customer = str(booking.get("user_id")) == user_id
    is_owner = str(salon.get("owner_id")) == user_id
    if not (is_customer or is_owner):
        raise _err(403, "BOOKING_FORBIDDEN", "You cannot view this booking.")

    return {
        "booking_id": booking_id,
        "payment_method": booking.get("payment_method"),
        "payment_status": booking.get("payment_status"),
        "payment_verification_status": booking.get("payment_verification_status"),
        "booking_status": booking.get("status"),
        "booking_reference": booking.get("booking_reference"),
    }
