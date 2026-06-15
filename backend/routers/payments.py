import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import razorpay
from config import settings
from core.idempotency import idempotency_required
from core.limiter import limiter
from core.supabase import supabase
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from models.payments import PaymentCreate, PaymentStatus, PaymentVerifyRequest
from services import booking_push
from services import subscription_billing as billing

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/payments", tags=["Payments"])


def _razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment provider not configured")
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


@router.post("/create-order")
@limiter.limit("5/minute")
async def create_order(
    request: Request,
    data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    token = current_user.get("access_token")
    response = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{data.booking_id}&select=*",
        token=token,
    )
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = response.json()[0]
    if booking.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    if booking.get("payment_status") == PaymentStatus.paid.value:
        raise HTTPException(status_code=400, detail="Booking already paid")

    amount_paise = int(float(booking.get("amount", 0)) * 100)
    if amount_paise < 100:
        raise HTTPException(status_code=400, detail="Invalid booking amount")

    client = _razorpay_client()
    try:
        order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": str(data.booking_id)[:40],
                "notes": {
                    "booking_id": str(data.booking_id),
                    "user_id": str(current_user.get("id")),
                },
            }
        )
    except Exception as e:
        logger.error("[Payments] Razorpay order.create failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not create payment order")

    order_id = order["id"]
    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{data.booking_id}",
        json={
            "razorpay_order_id": order_id,
            "payment_status": PaymentStatus.pending.value,
        },
        service_role=True,
    )
    if patch.status_code not in (200, 201, 204):
        logger.error("[Payments] Failed to persist razorpay_order_id: %s", patch.text)

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "booking_id": data.booking_id,
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify")
@limiter.limit("5/minute")
@idempotency_required(required=True)
async def verify_payment(
    request: Request,
    payload: PaymentVerifyRequest,
    current_user: dict = Depends(get_current_user),
):
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment verification error")

    token = current_user.get("access_token")
    booking_resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?id=eq.{payload.booking_id}&select=*",
        token=token,
    )
    if booking_resp.status_code != 200 or not booking_resp.json():
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = booking_resp.json()[0]
    if booking.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    stored_order_id = booking.get("razorpay_order_id")
    if stored_order_id and stored_order_id != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order ID mismatch")

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    if booking.get("payment_status") == PaymentStatus.paid.value:
        return {"status": "success", "message": "Payment already verified"}

    client = _razorpay_client()
    try:
        order = client.order.fetch(payload.razorpay_order_id)
        expected_paise = int(float(booking.get("amount", 0)) * 100)
        if int(order.get("amount", 0)) != expected_paise:
            raise HTTPException(status_code=400, detail="Payment amount mismatch")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[Payments] order.fetch failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not verify payment amount")

    response = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{payload.booking_id}",
        json={
            "payment_status": PaymentStatus.paid.value,
            "payment_id": payload.razorpay_payment_id,
            "razorpay_order_id": payload.razorpay_order_id,
        },
        service_role=True,
    )

    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update payment status")

    try:
        ctx = await booking_push.fetch_booking_push_context(
            str(payload.booking_id),
            token,
        )
        if ctx:
            owner_id = ctx.get("owner_id")
            customer_name = await booking_push.fetch_user_name(current_user.get("id"))
            await booking_push.after_payment_verified(
                booking_id=str(payload.booking_id),
                owner_id=owner_id,
                customer_id=current_user.get("id"),
                customer_name=customer_name,
                service_name=ctx.get("service_name", "Service"),
                amount=float(booking.get("amount") or 0),
            )
    except Exception as e:
        logger.error("[Payments] owner push after verify failed: %s", e)

    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=200,
        content={"status": "success", "message": "Payment verified"},
    )


async def _mark_booking_paid_from_webhook(payment: dict) -> None:
    """Authoritative fallback for cases where the app closes after Razorpay charges
    but before the client can call /payments/verify. Webhook is signature-verified
    before this helper runs, so service-role writes are safe here."""
    order_id = payment.get("order_id")
    payment_id = payment.get("id")
    amount_paise = int(payment.get("amount") or 0)
    if not order_id or not payment_id:
        raise ValueError("Webhook payment missing order_id or payment id")

    booking_resp = await supabase.request(
        "GET",
        f"rest/v1/bookings?razorpay_order_id=eq.{order_id}&select=id,user_id,amount,payment_status,payment_id",
        service_role=True,
    )
    if booking_resp.status_code != 200 or not booking_resp.json():
        raise ValueError(f"No booking found for Razorpay order {order_id}")

    booking = booking_resp.json()[0]
    expected_paise = int(float(booking.get("amount") or 0) * 100)
    if expected_paise != amount_paise:
        raise ValueError(
            f"Payment amount mismatch for booking {booking.get('id')}: expected {expected_paise}, got {amount_paise}"
        )

    if booking.get("payment_status") == PaymentStatus.paid.value:
        return

    patch = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{booking['id']}",
        json={
            "payment_status": PaymentStatus.paid.value,
            "payment_id": payment_id,
            "razorpay_order_id": order_id,
        },
        service_role=True,
    )
    if patch.status_code not in (200, 201, 204):
        raise ValueError(
            f"Failed to mark booking paid: {patch.status_code} {patch.text[:300]}"
        )

    try:
        ctx = await booking_push.fetch_booking_push_context(
            str(booking["id"]), settings.SUPABASE_SERVICE_ROLE_KEY
        )
        if ctx:
            customer_name = await booking_push.fetch_user_name(
                str(booking.get("user_id"))
            )
            await booking_push.after_payment_verified(
                booking_id=str(booking["id"]),
                owner_id=ctx.get("owner_id"),
                customer_id=str(booking.get("user_id")),
                customer_name=customer_name,
                service_name=ctx.get("service_name", "Service"),
                amount=float(booking.get("amount") or 0),
            )
    except Exception as e:
        logger.error(
            "[Payments][Webhook] push after captured failed booking=%s err=%s",
            booking.get("id"),
            e,
        )


@router.post("/webhook")
async def razorpay_booking_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    x_razorpay_event_id: Optional[str] = Header(None),
):
    raw = await request.body()
    if not billing.verify_webhook_signature(raw, x_razorpay_signature or ""):
        logger.warning(
            "[Payments][Webhook] invalid signature event_id=%s", x_razorpay_event_id
        )
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = x_razorpay_event_id or f"payments:{hashlib.sha256(raw).hexdigest()}"
    log_insert = await supabase.request(
        "POST",
        "rest/v1/webhook_logs",
        service_role=True,
        json={
            "provider": "razorpay:payments",
            "event_id": event_id,
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
    processed_ok = True
    err_text = None
    try:
        if event_type == "payment.captured":
            payment = ((event.get("payload") or {}).get("payment") or {}).get(
                "entity"
            ) or {}
            await _mark_booking_paid_from_webhook(payment)
        elif event_type in {"payment.failed", "order.paid"}:
            logger.info("[Payments][Webhook] acknowledged event=%s", event_type)
        else:
            logger.info("[Payments][Webhook] ignored event=%s", event_type)
    except Exception as e:
        logger.exception(
            "[Payments][Webhook] processing failed event=%s: %s", event_type, e
        )
        processed_ok = False
        err_text = str(e)[:500]

    await supabase.request(
        "PATCH",
        f"rest/v1/webhook_logs?event_id=eq.{event_id}",
        service_role=True,
        json={
            "event_type": event_type,
            "payload": event,
            "processed": processed_ok,
            "processing_error": err_text,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {"status": "ok"}


@router.get("/status")
async def get_payment_status(
    order_id: str, current_user: dict = Depends(get_current_user)
):
    response = await supabase.request(
        "GET",
        f"rest/v1/bookings?razorpay_order_id=eq.{order_id}&select=payment_status,user_id",
        token=current_user.get("access_token"),
    )
    if response.status_code != 200 or not response.json():
        return {"status": "unknown"}

    row = response.json()[0]
    if row.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    return {"status": row.get("payment_status", "pending")}
