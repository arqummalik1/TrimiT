"""Application-managed field encryption for sensitive bank/KYC data at rest.

This module provides symmetric encryption (Fernet / AES-128-CBC + HMAC) for the
small set of Sensitive_Fields that must be stored encrypted: the full bank
account number, PAN, and GSTIN.

Security boundary
-----------------
- The key comes ONLY from ``settings.FIELD_ENCRYPTION_KEY`` (a urlsafe-base64
  Fernet key). There is intentionally **no hardcoded fallback key**: if the key
  is unset/empty, ``encrypt`` and ``decrypt`` raise a structured ``RuntimeError``
  ("FIELD_ENCRYPTION_KEY is not configured") so the system fails closed rather
  than silently using a default. Layer A endpoints are not exercised until the
  key is configured in the environment, so this is acceptable.
- Plaintext values and the key itself are NEVER logged. Do not add logging of
  inputs/outputs to this module.

Validates: Requirements 1.5 (encrypt at rest), 13.5 (exclude sensitive fields
and credentials from logs). See design Correctness Property 8.
"""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet

from config import settings

_KEY_NOT_CONFIGURED = "FIELD_ENCRYPTION_KEY is not configured"


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    """Lazily build (and cache) the Fernet instance from settings.

    Raises:
        RuntimeError: if ``FIELD_ENCRYPTION_KEY`` is unset or empty.
        ValueError: if the configured key is not a valid Fernet key.
    """
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        raise RuntimeError(_KEY_NOT_CONFIGURED)
    # Fernet accepts the urlsafe-base64 key as bytes; let it validate format.
    return Fernet(key.encode("utf-8"))


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string, returning a Fernet token (str).

    Raises:
        RuntimeError: if ``FIELD_ENCRYPTION_KEY`` is not configured.
    """
    fernet = _get_fernet()
    token = fernet.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt(token: str) -> str:
    """Decrypt a Fernet token, returning the original plaintext (str).

    Raises:
        RuntimeError: if ``FIELD_ENCRYPTION_KEY`` is not configured.
        cryptography.fernet.InvalidToken: if the token is invalid/tampered.
    """
    fernet = _get_fernet()
    plaintext = fernet.decrypt(token.encode("utf-8"))
    return plaintext.decode("utf-8")


def last4(value: str) -> str:
    """Return the last 4 characters of ``value`` (or fewer if shorter).

    Used to derive ``*_last4`` display columns without exposing the full value.
    Operates on plaintext only — never pass a ciphertext token here.
    """
    return value[-4:]
