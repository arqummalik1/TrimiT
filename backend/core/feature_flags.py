"""Server-side feature-flag gating for the PayU online-payment / payout path.

The entire Layer B (charge & split) surface is gated behind
``PAYU_PAYOUTS_ENABLED``. This module is the single, import-safe place that
resolves the flag at request time.

Fail-closed contract (Requirements 4.1, 4.2, 4.3): if the flag is unset or
cannot be parsed into a clear boolean, the path is treated as **disabled**.
"""

from config import settings


def payu_payouts_enabled() -> bool:
    """Return whether the online-payment / payout path is enabled.

    Fails closed: any unset / unparseable / non-boolean value resolves to
    ``False`` so online payments never accidentally go live.
    """
    value = getattr(settings, "PAYU_PAYOUTS_ENABLED", False)
    if value is True:
        return True
    if value is False or value is None:
        return False
    # Defensive parse for stringly-typed overrides ("true"/"1"/"yes").
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "on")
    # Anything else (ints, unexpected types) → fail closed.
    try:
        return bool(value)
    except Exception:
        return False
