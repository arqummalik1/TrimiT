"""Pydantic models / DTOs for the TrimiT Pro subscription system."""

from __future__ import annotations

from enum import Enum
from typing import Optional, List

from pydantic import BaseModel, Field


class SubscriptionStatus(str, Enum):
    trial = "trial"
    active = "active"
    expired = "expired"
    cancelled = "cancelled"
    payment_failed = "payment_failed"
    past_due = "past_due"
    grace_period = "grace_period"


# Statuses that grant premium access.
ACCESS_GRANTING_STATUSES = {
    SubscriptionStatus.trial.value,
    SubscriptionStatus.active.value,
    SubscriptionStatus.grace_period.value,
}


class SubscriptionOut(BaseModel):
    id: str
    owner_id: str
    salon_id: Optional[str] = None
    plan: str = "trimit_pro"
    status: SubscriptionStatus
    # Derived access fields (single source of truth = backend)
    has_access: bool
    is_trial: bool
    trial_days_remaining: int = 0
    trial_start: Optional[str] = None
    trial_end: Optional[str] = None
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    next_renewal_at: Optional[str] = None
    cancel_at_period_end: bool = False
    cancelled_at: Optional[str] = None
    amount: int = 29900
    currency: str = "INR"
    razorpay_subscription_id: Optional[str] = None
    created_at: Optional[str] = None


class SubscriptionStatusOut(BaseModel):
    status: SubscriptionStatus
    has_access: bool
    is_trial: bool
    trial_days_remaining: int = 0
    next_renewal_at: Optional[str] = None
    enforcement_enabled: bool = False


class PaymentOut(BaseModel):
    id: str
    amount: int
    currency: str = "INR"
    status: str
    method: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_invoice_id: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: Optional[str] = None


class PaymentHistoryOut(BaseModel):
    total_paid: int = 0
    currency: str = "INR"
    payments: List[PaymentOut] = Field(default_factory=list)


class CreateSubscriptionResponse(BaseModel):
    subscription_id: str           # Razorpay subscription id
    key_id: str
    plan_id: str
    amount: int
    currency: str = "INR"
    customer_id: Optional[str] = None


class VerifySubscriptionRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


class CancelSubscriptionRequest(BaseModel):
    # When true (default), access continues until period end; otherwise cancel now.
    cancel_at_cycle_end: bool = True
