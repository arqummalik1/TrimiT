"""Unit tests for the abstract payment module (services/payments).

Pure logic — no network/DB. Covers provider resolution, the UPI-intent payload
(deep link + amount formatting), and booking-reference generation.
"""

import re

from services.payments import (
    PaymentMethod,
    PaymentVerificationStatus,
    get_payment_provider,
    generate_booking_reference,
)
from services.payments.base import (
    CashAtSalonProvider,
    UpiIntentManualVerificationProvider,
)


# ── provider resolution ──────────────────────────────────────────────────────

def test_get_provider_upi():
    p = get_payment_provider("upi")
    assert isinstance(p, UpiIntentManualVerificationProvider)
    assert p.requires_manual_verification is True
    assert p.initial_verification_status == PaymentVerificationStatus.initiated


def test_get_provider_cash():
    p = get_payment_provider("salon_cash")
    assert isinstance(p, CashAtSalonProvider)
    assert p.requires_manual_verification is False
    assert p.initial_verification_status == PaymentVerificationStatus.not_required


def test_get_provider_unknown_returns_none():
    assert get_payment_provider("paypal") is None
    assert get_payment_provider("") is None


# ── UPI intent ───────────────────────────────────────────────────────────────

def test_build_upi_intent_happy_path():
    p = get_payment_provider("upi")
    intent = p.build_upi_intent(
        salon={"upi_id": "glowsalon@okaxis", "name": "Glow Salon"},
        amount=499,
        booking_reference="TRM-2026-7F3A91",
    )
    assert intent is not None
    assert intent.payee_vpa == "glowsalon@okaxis"
    assert intent.payee_name == "Glow Salon"
    assert intent.amount == "499.00"  # 2-decimal string used inside the deep link
    assert intent.booking_reference == "TRM-2026-7F3A91"
    assert "TRM-2026-7F3A91" in intent.transaction_note
    # Deep link carries payee, amount, note.
    uri = intent.intent_uri
    assert uri.startswith("upi://pay?")
    assert "pa=glowsalon%40okaxis" in uri
    assert "am=499.00" in uri
    assert "cu=INR" in uri
    # JSON-facing dict exposes a NUMERIC amount (clients format it).
    assert intent.to_dict()["amount"] == 499.0


def test_build_upi_intent_amount_two_decimals():
    p = get_payment_provider("upi")
    intent = p.build_upi_intent(
        salon={"upi_id": "x@y", "name": "X"}, amount=1234.5, booking_reference="TRM-1"
    )
    assert intent.amount == "1234.50"


def test_build_upi_intent_without_upi_id_returns_none():
    p = get_payment_provider("upi")
    assert p.build_upi_intent(salon={"name": "No UPI"}, amount=100, booking_reference="R") is None
    assert p.build_upi_intent(salon={"upi_id": ""}, amount=100, booking_reference="R") is None


def test_cash_provider_builds_no_intent():
    p = get_payment_provider("salon_cash")
    assert p.build_upi_intent(salon={"upi_id": "x@y"}, amount=100, booking_reference="R") is None


# ── booking reference ────────────────────────────────────────────────────────

_REF_RE = re.compile(r"^TRM-\d{4}-[2-9A-HJ-NP-Z]{6}$")


def test_booking_reference_format():
    ref = generate_booking_reference()
    assert _REF_RE.match(ref), ref


def test_booking_reference_no_ambiguous_chars():
    # No 0/O/1/I/L in the suffix (easy to read aloud / type when matching a payment).
    suffix = generate_booking_reference().split("-")[-1]
    assert not set(suffix) & set("01OIL")


def test_booking_reference_unique_enough():
    refs = {generate_booking_reference() for _ in range(200)}
    # 200 random 6-char (31-alphabet) suffixes should essentially never collide.
    assert len(refs) >= 199


def test_payment_method_enum_values():
    assert {m.value for m in PaymentMethod} == {"salon_cash", "upi"}
