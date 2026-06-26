"""Commission / PayU-fee split math (Layer B, money is integer paise).

Implements Correctness Property 2 (Requirement 7.5): for every captured
payment,

    commission_paise + payu_fee_paise + vendor_paise == amount_paise

with **zero residual**, all integers. Rounding is half-up (a residual of half
a paise or more rounds up — Requirement 7.2), computed with ``Decimal`` so we
never touch floating point for money and never get banker's rounding.

``get_commission_percent`` reads the Admin-adjustable rate from the
``app_settings`` table, falling back to the configured default. It never
raises — it always returns a float (Requirement 15.1, 15.5).
"""

import logging
from decimal import Decimal, ROUND_HALF_UP

from config import settings

logger = logging.getLogger("trimit")

# Payment amount bounds in paise (Requirement 6.2): 1 .. 9,999,999,999 inclusive.
MIN_AMOUNT_PAISE = 1
MAX_AMOUNT_PAISE = 9_999_999_999


def _round_half_up(amount_paise: int, percent: float) -> int:
    """Return round-half-up of ``amount_paise * percent / 100`` as an int.

    Uses ``Decimal`` with ``ROUND_HALF_UP`` — NOT Python's built-in ``round``
    (banker's rounding) — so 9.95 paise → 10, 3.98 → 4, etc.
    """
    raw = (Decimal(amount_paise) * Decimal(str(percent))) / Decimal(100)
    return int(raw.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def compute_split(
    amount_paise: int,
    commission_percent: float,
    payu_fee_percent: float,
) -> dict[str, int]:
    """Split a captured amount into commission, PayU fee, and vendor net.

    All values are integer paise and reconcile exactly:
    ``commission + payu_fee + vendor == amount`` (vendor is the remainder, so
    the invariant holds by construction).

    Raises ``ValueError`` for an out-of-range / non-int amount, negative
    percents, or percents so large the vendor would go negative.
    """
    # Reject bools (a bool is an int subclass) and non-ints explicitly.
    if isinstance(amount_paise, bool) or not isinstance(amount_paise, int):
        raise ValueError("amount_paise must be an integer number of paise")
    if amount_paise < MIN_AMOUNT_PAISE or amount_paise > MAX_AMOUNT_PAISE:
        raise ValueError(
            f"amount_paise must be between {MIN_AMOUNT_PAISE} and "
            f"{MAX_AMOUNT_PAISE} inclusive, got {amount_paise}"
        )
    if commission_percent < 0 or payu_fee_percent < 0:
        raise ValueError("commission_percent and payu_fee_percent must be >= 0")

    commission_paise = _round_half_up(amount_paise, commission_percent)
    payu_fee_paise = _round_half_up(amount_paise, payu_fee_percent)

    if commission_paise + payu_fee_paise > amount_paise:
        raise ValueError(
            "commission_paise + payu_fee_paise exceeds amount_paise; "
            "vendor share would be negative"
        )

    vendor_paise = amount_paise - commission_paise - payu_fee_paise

    return {
        "amount_paise": amount_paise,
        "commission_paise": commission_paise,
        "payu_fee_paise": payu_fee_paise,
        "vendor_paise": vendor_paise,
    }


async def get_commission_percent() -> float:
    """Read the Admin-configured commission percent from ``app_settings``.

    Falls back to ``settings.PLATFORM_COMMISSION_PERCENT`` (default 5.0) when
    the row is missing, unreadable, or unparseable. Never raises.
    """
    fallback = float(settings.PLATFORM_COMMISSION_PERCENT)
    try:
        from core.supabase import supabase

        response = await supabase.request(
            "GET",
            "rest/v1/app_settings?key=eq.commission_percent&select=value",
            service_role=True,
        )
        if response.status_code != 200:
            return fallback
        rows = response.json()
        if not rows:
            return fallback
        value = rows[0].get("value")
        if value is None:
            return fallback
        return float(value)
    except Exception:
        logger.warning("commission_percent lookup failed; using default", exc_info=True)
        return fallback
