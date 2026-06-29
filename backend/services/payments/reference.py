"""Unique, human-readable booking reference generation.

A booking reference (e.g. ``TRM-2026-7F3A91``) is attached to every UPI payment
so a salon owner can match an incoming UPI transfer to the right booking. It is
NOT a secret — it is meant to be shown to the customer and, where the UPI app
supports it, carried in the transaction note.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

# Crockford-style alphabet: no ambiguous 0/O/1/I/L so references are easy to
# read aloud and type when a salon matches a payment by hand.
_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
_SUFFIX_LEN = 6


def generate_booking_reference(now: datetime | None = None) -> str:
    """Return a fresh booking reference like ``TRM-2026-7F3A91``.

    Uniqueness is enforced at the database layer by a UNIQUE index on
    ``bookings.booking_reference`` (migration 49); callers should regenerate on
    the rare collision. The random suffix uses ``secrets`` for unguessability.
    """
    year = (now or datetime.now(timezone.utc)).year
    suffix = "".join(secrets.choice(_ALPHABET) for _ in range(_SUFFIX_LEN))
    return f"TRM-{year}-{suffix}"
