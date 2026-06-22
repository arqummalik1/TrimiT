Give me an app idea in 2026 which I mean can build the app and will list on the Google Play Store and user will download it and I will put ads on it. What kind of apps do you suggest in 2026?"""
Subscription billing stubs.
Payment Gateway is being updated.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("trimit")


def create_customer(name: str, email: str, contact: Optional[str]) -> Optional[str]:
    return None


def create_subscription(
    *,
    start_at: Optional[int] = None,
    notes: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {}


def cancel_subscription(rzp_subscription_id: str, *, at_cycle_end: bool) -> Dict[str, Any]:
    return {}


def verify_checkout_signature(
    *, razorpay_payment_id: str, razorpay_subscription_id: str, razorpay_signature: str
) -> bool:
    return False


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    return False

