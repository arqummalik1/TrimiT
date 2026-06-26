"""Unit tests for core.crypto field encryption.

Validates: Requirements 1.5 (encrypt at rest), 13.5. See Property 8.
"""

import pytest
from cryptography.fernet import Fernet

from core import crypto


@pytest.fixture
def configured_key(monkeypatch):
    """Configure a fresh test Fernet key and reset the cached Fernet instance."""
    key = Fernet.generate_key().decode("utf-8")
    monkeypatch.setattr(crypto.settings, "FIELD_ENCRYPTION_KEY", key)
    crypto._get_fernet.cache_clear()
    yield key
    crypto._get_fernet.cache_clear()


def test_encrypt_decrypt_round_trip(configured_key):
    plaintext = "1234567890123456"
    token = crypto.encrypt(plaintext)
    assert crypto.decrypt(token) == plaintext


def test_ciphertext_differs_from_plaintext(configured_key):
    plaintext = "ABCDE1234F"  # sample PAN-shaped value
    token = crypto.encrypt(plaintext)
    assert token != plaintext


def test_last4_returns_last_four_chars():
    assert crypto.last4("1234567890123456") == "3456"


def test_last4_handles_short_strings():
    assert crypto.last4("12") == "12"
    assert crypto.last4("") == ""


def test_encrypt_raises_when_key_unset(monkeypatch):
    monkeypatch.setattr(crypto.settings, "FIELD_ENCRYPTION_KEY", None)
    crypto._get_fernet.cache_clear()
    with pytest.raises(RuntimeError, match="FIELD_ENCRYPTION_KEY is not configured"):
        crypto.encrypt("secret")
    crypto._get_fernet.cache_clear()


def test_decrypt_raises_when_key_unset(monkeypatch):
    monkeypatch.setattr(crypto.settings, "FIELD_ENCRYPTION_KEY", "")
    crypto._get_fernet.cache_clear()
    with pytest.raises(RuntimeError, match="FIELD_ENCRYPTION_KEY is not configured"):
        crypto.decrypt("anytoken")
    crypto._get_fernet.cache_clear()
