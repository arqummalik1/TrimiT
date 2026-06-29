"""Payment API models — UPI-intent + manual verification (v1).

TrimiT never collects customer money in v1. These models support:
  * customer initiating a UPI payment (we hand back UPI-intent params), and
  * the salon owner verifying or rejecting that payment.

The booking lifecycle (``bookings.status``) stays separate from the payment
verification workflow (``bookings.payment_verification_status``).
"""

from typing import Optional

from pydantic import BaseModel, Field


class UpiInitiateRequest(BaseModel):
    """Customer asks to pay a booking via UPI; we return the intent params."""

    booking_id: str


class UpiIntentResponse(BaseModel):
    """UPI-intent payload the client uses to launch the user's UPI app."""

    payee_vpa: str
    payee_name: str
    amount: float
    currency: str = "INR"
    transaction_note: str
    booking_reference: str
    intent_uri: str


class UpiInitiateResponse(BaseModel):
    """Response to a UPI initiation. Never implies the payment succeeded."""

    booking_id: str
    booking_reference: str
    payment_verification_status: str
    upi: UpiIntentResponse
    # Core business rule: we always tell the customer to wait for the salon.
    message: str = (
        "We are waiting for the salon to verify your payment. "
        "Most salons verify payments within 2–5 minutes."
    )


class UpiAwaitVerificationRequest(BaseModel):
    """Customer returned from the UPI app (paid or not — we cannot know)."""

    booking_id: str


class PaymentVerificationAction(BaseModel):
    """Owner verifies or rejects a UPI payment. ``notes`` is optional context."""

    notes: Optional[str] = Field(default=None, max_length=500)
