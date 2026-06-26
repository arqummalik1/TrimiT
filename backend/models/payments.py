from pydantic import BaseModel, ConfigDict
from typing import Optional
from enum import Enum

class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"
    partially_refunded = "partially_refunded"

class PaymentCreate(BaseModel):
    booking_id: str


class RefundCreate(BaseModel):
    """Refund request body for ``POST /payments/refund`` (Task 16, Req 11).

    Additive model — it does not touch any existing request shape. ``amount_paise``
    is optional: ``None`` means refund the full remaining captured amount
    (payment amount minus prior in-progress/completed refunds). When supplied it
    is an integer number of paise and must be ``1 <= amount_paise <= remaining``
    (Req 11.2, 11.3). ``reason`` is an optional free-text note stored on the
    refund row; it must never contain card/PII data (the client supplies only a
    short reason such as "customer_cancellation").
    """

    payment_id: str
    amount_paise: Optional[int] = None
    reason: Optional[str] = None

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: str


class PayuVerifyRequest(BaseModel):
    """PayU callback / verify posted fields (Task 13, Req 8.1–8.6).

    PayU posts the transaction result form-encoded on the browser callback. This
    model is **additive** (it does not touch ``PaymentVerifyRequest``, which
    other code/tests still reference) and **permissive** — PayU sends many
    fields beyond the ones named here, so ``extra="allow"`` keeps them rather
    than rejecting the callback. Every named field is optional because a
    tampered / malformed callback may omit them; the handler verifies the hash
    before trusting any value.

    Sensitive note: ``hash`` is a signature and ``email`` / ``firstname`` are
    PII — these are used for verification only and are never written to
    application logs.
    """

    model_config = ConfigDict(extra="allow")

    status: Optional[str] = None
    txnid: Optional[str] = None
    amount: Optional[str] = None
    productinfo: Optional[str] = None
    firstname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hash: Optional[str] = None
    mihpayid: Optional[str] = None
    udf1: Optional[str] = None
    udf2: Optional[str] = None
    udf3: Optional[str] = None
    udf4: Optional[str] = None
    udf5: Optional[str] = None


class OwnerEarningItem(BaseModel):
    """One row of the owner earnings view (Task 18, Req 12.2, 16.4).

    Additive, read-only projection of a ``payments`` row. Carries the salon's
    own non-sensitive ledger fields plus ``settlement_status`` so a ``paid``
    payment can be shown with its true settlement state and never as money
    already in the bank.
    """

    payment_id: str
    booking_id: str
    amount_paise: int
    commission_paise: int
    payu_fee_paise: int
    vendor_paise: int
    payment_status: str
    settlement_status: str
    created_at: str


class OwnerEarningsSummary(BaseModel):
    """Net-earnings aggregates that keep settled vs pending explicit (Req 16.4, 16.5).

    ``total_settled_paise`` counts only funds PayU has actually transferred
    (``settlement_status == 'settled'``); earned-but-unsettled amounts sit in
    ``total_pending_settlement_paise`` so a ``paid`` payment is never presented
    as settled money.
    """

    total_earned_paise: int = 0
    total_settled_paise: int = 0
    total_pending_settlement_paise: int = 0


class OwnerEarningsResponse(BaseModel):
    """Response body for ``GET /owner/earnings`` (Task 18)."""

    items: list[OwnerEarningItem] = []
    summary: OwnerEarningsSummary
