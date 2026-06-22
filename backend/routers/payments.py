import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from models.payments import PaymentCreate, PaymentVerifyRequest
from dependencies.auth import get_current_user

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-order")
async def create_order(
    request: Request,
    data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    # Returning 501 so the frontend gracefully handles the failure
    raise HTTPException(status_code=501, detail="Payment Gateway integration is currently being updated. Online payments are temporarily disabled.")

@router.post("/verify")
async def verify_payment(
    request: Request,
    payload: PaymentVerifyRequest,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Payment Gateway integration is currently being updated.")

@router.post("/webhook")
async def razorpay_booking_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    x_razorpay_event_id: Optional[str] = Header(None),
):
    return {"status": "ok", "message": "Webhook deactivated"}

@router.get("/status")
async def get_payment_status(
    order_id: str, current_user: dict = Depends(get_current_user)
):
    return {"status": "unknown"}
