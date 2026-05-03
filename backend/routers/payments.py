from fastapi import APIRouter, Request, HTTPException, Depends, status
import hmac
import hashlib
import uuid
import logging

from config import settings
from core.supabase import supabase
from core.limiter import limiter
from core.idempotency import idempotency_required
from dependencies.auth import get_current_user
from models.payments import PaymentCreate, PaymentVerifyRequest, PaymentStatus

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-order")
@limiter.limit("5/minute")
async def create_order(request: Request, data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    # 1. Fetch booking
    response = await supabase.request("GET", f"rest/v1/bookings?id=eq.{data.booking_id}&select=*", token=current_user.get("access_token"))
    if response.status_code != 200 or not response.json():
        raise HTTPException(status_code=404, detail="Booking not found")
        
    booking = response.json()[0]
    
    # 2. Mock Razorpay Order (Integration point)
    amount = int(booking.get("amount", 0) * 100) # paise
    order_id = f"order_{uuid.uuid4().hex[:16]}"
    
    return {
        "order_id": order_id,
        "amount": amount,
        "currency": "INR",
        "booking_id": data.booking_id,
        "key_id": settings.RAZORPAY_KEY_ID
    }

@router.post("/verify")
@limiter.limit("5/minute")
@idempotency_required
async def verify_payment(request: Request, payload: PaymentVerifyRequest, current_user: dict = Depends(get_current_user)):
    # 1. Verify Signature
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment verification error")
        
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    # 2. Update status
    response = await supabase.request(
        "PATCH", 
        f"rest/v1/bookings?id=eq.{payload.booking_id}", 
        json={"payment_status": PaymentStatus.paid.value},
        token=current_user.get("access_token")
    )
    
    if response.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=400, detail="Failed to update payment status")
        
    return {"status": "success", "message": "Payment verified"}

@router.get("/status")
async def get_payment_status(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    Check status of a payment order. 
    In production, this would query the Razorpay API.
    For now, we query our own bookings table to see if it was marked as paid.
    """
    response = await supabase.request(
        "GET", 
        f"rest/v1/bookings?razorpay_order_id=eq.{order_id}&select=payment_status",
        token=current_user.get("access_token")
    )
    
    if response.status_code != 200 or not response.json():
        return {"status": "not_found"}
        
    booking = response.json()[0]
    return {"status": booking.get("payment_status", "pending")}
