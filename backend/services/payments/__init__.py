"""Payment module — provider-abstracted payment handling.

The booking engine MUST NOT depend on any concrete payment provider. It only
ever talks to the abstract :class:`PaymentProvider` interface via
:func:`get_payment_provider`. This keeps payment logic swappable: today we ship
``salon_cash`` (no verification) and ``upi`` (UPI-intent + manual salon
verification); future gateways (marketplace split, merchant gateway, webhook
verification) can be added as new providers without touching booking code.
"""

from .base import (
    PaymentMethod,
    PaymentProvider,
    PaymentVerificationStatus,
    UpiIntent,
    get_payment_provider,
)
from .reference import generate_booking_reference

__all__ = [
    "PaymentMethod",
    "PaymentProvider",
    "PaymentVerificationStatus",
    "UpiIntent",
    "get_payment_provider",
    "generate_booking_reference",
]
