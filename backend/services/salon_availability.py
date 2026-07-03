"""Salon open/close availability — single source of truth.

A salon's "accepting bookings" state is a SEPARATE axis from subscription:
  * subscription_active = "has the owner paid?" (system)
  * accepting_bookings  = "is the owner choosing to take bookings now?" (owner)

`is_salon_closed` evaluates the open/close window LAZILY (on read) so the salon
auto-opens the instant `closed_until` passes, even if the reopen cron is late.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        s = str(value).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def is_salon_closed(salon: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str]]:
    """Return (closed, reopen_at_iso, reason).

    closed = True means the owner has turned OFF new bookings AND any timed
    reopen window has NOT yet passed. `reopen_at_iso` is the ISO time it
    reopens (None = indefinite). `reason` is the optional owner note.
    """
    # Column may be absent on old rows before migration 53 → treat as open.
    accepting = salon.get("accepting_bookings", True)
    if accepting is None:
        accepting = True
    if accepting:
        return False, None, None

    closed_until = _parse_dt(salon.get("closed_until"))
    if closed_until is not None and datetime.now(timezone.utc) >= closed_until:
        # The timed window has elapsed → salon is effectively open again.
        return False, None, None

    reopen_iso = closed_until.isoformat() if closed_until else None
    return True, reopen_iso, salon.get("closed_reason")


def closed_booking_message(reopen_at_iso: Optional[str], reason: Optional[str]) -> str:
    """Customer-facing message when a salon is temporarily closed."""
    base = "This salon is temporarily closed and not taking bookings right now."
    if reason:
        base = f"{base} ({reason})"
    if reopen_at_iso:
        return f"{base} Please check back after it reopens."
    return f"{base} Please check back later."
