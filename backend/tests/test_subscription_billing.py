"""Unit tests for Razorpay signature verification (services/subscription_billing).

Security-critical pure logic. We set known test secrets via monkeypatch and
compute the expected HMAC-SHA256 the same way Razorpay does, then assert the
verifier accepts the correct signature and rejects tampered / missing ones.
"""

import hashlib
import hmac

import pytest

from services import subscription_billing as billing

KEY_SECRET = "test_key_secret_123"
WEBHOOK_SECRET = "test_webhook_secret_456"


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(billing.settings, "RAZORPAY_KEY_ID", "rzp_test_keyid")
    monkeypatch.setattr(billing.settings, "RAZORPAY_KEY_SECRET", KEY_SECRET)
    monkeypatch.setattr(billing.settings, "RAZORPAY_PLAN_ID", "plan_123")
    monkeypatch.setattr(billing.settings, "RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET)


def _sign(secret: str, message: str) -> str:
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


# ── checkout signature ───────────────────────────────────────────────────────

def test_checkout_signature_valid(configured):
    payment_id, sub_id = "pay_1", "sub_1"
    sig = _sign(KEY_SECRET, f"{payment_id}|{sub_id}")
    assert billing.verify_checkout_signature(
        razorpay_payment_id=payment_id,
        razorpay_subscription_id=sub_id,
        razorpay_signature=sig,
    ) is True


def test_checkout_signature_tampered(configured):
    sig = _sign(KEY_SECRET, "pay_1|sub_1")
    # Different subscription id → signature no longer matches.
    assert billing.verify_checkout_signature(
        razorpay_payment_id="pay_1",
        razorpay_subscription_id="sub_DIFFERENT",
        razorpay_signature=sig,
    ) is False


def test_checkout_signature_missing_secret(monkeypatch):
    monkeypatch.setattr(billing.settings, "RAZORPAY_KEY_SECRET", None)
    assert billing.verify_checkout_signature(
        razorpay_payment_id="p", razorpay_subscription_id="s", razorpay_signature="x"
    ) is False


# ── webhook signature ────────────────────────────────────────────────────────

def test_webhook_signature_valid(configured):
    body = b'{"event":"subscription.charged"}'
    sig = _sign(WEBHOOK_SECRET, body.decode())
    assert billing.verify_webhook_signature(body, sig) is True


def test_webhook_signature_invalid(configured):
    body = b'{"event":"subscription.charged"}'
    assert billing.verify_webhook_signature(body, "deadbeef") is False


def test_webhook_signature_missing(configured):
    body = b'{"event":"x"}'
    assert billing.verify_webhook_signature(body, None) is False
