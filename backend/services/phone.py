"""Indian mobile normalization — E.164 +91 for storage and uniqueness checks."""

from __future__ import annotations

import re
from typing import Optional

_PHONE_DIGITS = re.compile(r"[^0-9]")


def normalize_india_phone(value: Optional[str]) -> Optional[str]:
    if not value or not str(value).strip():
        return None
    digits = _PHONE_DIGITS.sub("", str(value).strip())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        return None
    return f"+91{digits}"


def is_valid_india_phone(value: Optional[str]) -> bool:
    return normalize_india_phone(value) is not None
