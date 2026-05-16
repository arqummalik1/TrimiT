from fastapi import APIRouter, Request, HTTPException, Depends, status
import hmac
import hashlib
import logging

import razorpay

from config import settings
from core.supabase import supabase
from core.limiter import limiter
from core.idempotency import idempotency_required
from dependencies.auth import get_current_user
from models.payments import PaymentCreate, PaymentVerifyRequest, PaymentStatus

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/payments", tags=["Payments"])

def _razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment provider not configured")
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.post("/create-order")
@limiter.limit("5/minute")
async def create_order(request: Request, data: PaymentCreate, current_user: dict = Depends(get_current_user)):
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
        json={"razorpay_order_id": order_id, "payment_status": PaymentStatus.pending.value},
        token=token,
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
async def verify_payment(request: Request, payload: PaymentVerifyRequest, current_user: dict = Depends(get_current_user)):
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

    response = await supabase.request(
        "PATCH",
        f"rest/v1/bookings?id=eq.{payload.booking_id}",
        json={
            "payment_status": PaymentStatus.paid.value,
            "payment_id": payload.razorpay_payment_id,
            "razorpay_order_id": payload.razorpay_order_id,
        },
        token=token,
    )

    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update payment status")

    return {"status": "success", "message": "Payment verified"}


@router.get("/status")
async def get_payment_status(order_id: str, current_user: dict = Depends(get_current_user)):
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
