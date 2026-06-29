"""Abstract payment provider contract + concrete v1 implementations.

Design
------
``PaymentProvider`` is the single seam the rest of the app depends on. Booking
code never imports a concrete provider — it resolves one through
:func:`get_payment_provider` by the booking's ``payment_method``.

v1 providers
------------
* :class:`CashAtSalonProvider` (``salon_cash``) — no online step, no
  verification. The booking is paid in person.
* :class:`UpiIntentManualVerificationProvider` (``upi``) — builds a UPI-intent
  payload for the customer's UPI app and requires MANUAL verification by the
  salon owner. Returning from the UPI app does NOT mean the payment succeeded,
  so this provider never reports success on its own.

Future providers (marketplace split, merchant gateway, webhook verification)
implement the same interface and are registered in ``_REGISTRY`` without any
change to booking logic.

Money note: amounts here are rupees (the bookings table stores ``amount`` in
rupees as NUMERIC), formatted to 2 decimals only at the UPI boundary.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Optional
from urllib.parse import quote


class PaymentMethod(str, Enum):
    """Supported payment methods in v1."""

    salon_cash = "salon_cash"
    upi = "upi"


class PaymentVerificationStatus(str, Enum):
    """Payment verification workflow, independent of booking status.

    Mirrors the DB CHECK on ``bookings.payment_verification_status`` (migration
    49). ``not_required`` is used for cash bookings (nothing to verify).
    """

    not_required = "not_required"
    initiated = "initiated"
    waiting_verification = "waiting_verification"
    verified = "verified"
    rejected = "rejected"
    timeout = "timeout"


@dataclass(frozen=True)
class UpiIntent:
    """Everything the client needs to launch a UPI app for one payment.

    The native UPI-intent launcher lives on the client (a ``upi://pay?...``
    deep link); the backend supplies the signed-free, non-secret parameters and
    a ready-built ``intent_uri`` so every platform composes the same link.
    """

    payee_vpa: str          # pa — salon UPI ID
    payee_name: str         # pn — salon name
    amount: str             # am — rupees, 2 decimals (e.g. "499.00")
    transaction_note: str   # tn — carries the booking reference where shown
    booking_reference: str
    currency: str = "INR"   # cu

    @property
    def intent_uri(self) -> str:
        """Build the standard ``upi://pay`` deep link (RFC-style query)."""
        params = (
            f"pa={quote(self.payee_vpa)}"
            f"&pn={quote(self.payee_name)}"
            f"&am={quote(self.amount)}"
            f"&cu={quote(self.currency)}"
            f"&tn={quote(self.transaction_note)}"
        )
        return f"upi://pay?{params}"

    def to_dict(self) -> dict:
        return {
            "payee_vpa": self.payee_vpa,
            "payee_name": self.payee_name,
            # Numeric rupee amount for display (clients format it). The 2-decimal
            # string required by UPI lives only inside ``intent_uri`` (``am=``).
            "amount": float(self.amount),
            "currency": self.currency,
            "transaction_note": self.transaction_note,
            "booking_reference": self.booking_reference,
            "intent_uri": self.intent_uri,
        }


def _format_rupees(amount: object) -> str:
    """Format a rupee amount to exactly 2 decimals using Decimal (no float)."""
    return str(Decimal(str(amount or 0)).quantize(Decimal("0.01")))


class PaymentProvider(abc.ABC):
    """Abstract contract every payment provider implements."""

    method: PaymentMethod

    @property
    @abc.abstractmethod
    def requires_manual_verification(self) -> bool:
        """Whether a human (salon owner) must verify before confirming."""

    @property
    def initial_verification_status(self) -> PaymentVerificationStatus:
        """Verification status a freshly created booking starts in."""
        return (
            PaymentVerificationStatus.initiated
            if self.requires_manual_verification
            else PaymentVerificationStatus.not_required
        )

    def build_upi_intent(
        self, *, salon: dict, amount: object, booking_reference: str
    ) -> Optional[UpiIntent]:
        """Build a UPI intent for this booking, or ``None`` if not applicable.

        Default: providers that are not UPI-based return ``None``.
        """
        return None


class CashAtSalonProvider(PaymentProvider):
    """Pay-at-salon: confirmed per the normal booking flow, nothing to verify."""

    method = PaymentMethod.salon_cash

    @property
    def requires_manual_verification(self) -> bool:
        return False


class UpiIntentManualVerificationProvider(PaymentProvider):
    """Customer pays the salon's UPI directly; salon owner verifies manually.

    The provider can build the UPI-intent payload but has NO reliable way to
    confirm the payment itself — confirmation always comes from the salon owner
    (manual verification), never from the UPI app round-trip.
    """

    method = PaymentMethod.upi

    @property
    def requires_manual_verification(self) -> bool:
        return True

    def build_upi_intent(
        self, *, salon: dict, amount: object, booking_reference: str
    ) -> Optional[UpiIntent]:
        upi_id = (salon or {}).get("upi_id")
        if not upi_id:
            return None
        salon_name = str((salon or {}).get("name") or "Salon")
        return UpiIntent(
            payee_vpa=str(upi_id),
            payee_name=salon_name,
            amount=_format_rupees(amount),
            transaction_note=f"TrimiT {booking_reference}",
            booking_reference=booking_reference,
        )


# Single registry. Future providers register here; booking code never sees it.
_REGISTRY: dict[str, PaymentProvider] = {
    PaymentMethod.salon_cash.value: CashAtSalonProvider(),
    PaymentMethod.upi.value: UpiIntentManualVerificationProvider(),
}


def get_payment_provider(method: str) -> Optional[PaymentProvider]:
    """Resolve the provider for a payment method, or ``None`` if unsupported."""
    return _REGISTRY.get(str(method))
