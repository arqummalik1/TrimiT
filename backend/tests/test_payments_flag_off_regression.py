"""Flag-OFF regression guard for the PayU online-payment surface (Task 20).

This is the explicit production-default safety net. ``PAYU_PAYOUTS_ENABLED``
ships **disabled** (Req 4.2, 4.3), so these tests deliberately do **NOT**
monkeypatch the flag on — they exercise the real default the way production
runs today. While the flag is OFF:

  * ``POST /payments/create-order`` → ``403 ONLINE_PAYMENT_DISABLED`` and
    contacts neither Supabase nor PayU (Req 4.5, 6.6, 14.4, 14.5).
  * ``POST /payments/verify``       → ``403 ONLINE_PAYMENT_DISABLED`` (Req 4.5, 8.6).
  * ``POST /payments/webhook``      → ``200 {"status": "ignored"}`` and does
    nothing (Req 10.4 — avoids PayU retry storms while the feature is dark).
  * ``POST /payments/refund``       → ``403 ONLINE_PAYMENT_DISABLED`` and
    contacts neither Supabase nor PayU (Req 4.5, 11.2).

No-contact is proven structurally: ``mock_supabase`` (respx) is active with NO
routes registered, so ANY Supabase call would raise an unmocked-request error
instead of returning 403 — and the PayU service functions are monkeypatched to
trip a flag if they are ever invoked. Because the payment endpoints never reach
the database while the flag is OFF, they cannot touch the bookings table, so the
existing booking / pay-at-salon path is provably untouched by this surface
(Req 14.4, 14.5).

Split reconciliation (Req 7.5) is exhaustively covered in
``test_commission.py::test_split_reconciles_and_is_nonnegative_ints``; a single
sanity assertion is mirrored here so this regression file fails loudly if the
reconciliation invariant ever regresses.
"""

import pytest
from fastapi import status

from config import settings
from core.feature_flags import payu_payouts_enabled
from dependencies.auth import get_current_user
from services.commission import compute_split


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    """Disable the shared in-memory rate limiter (create-order/refund are limited).

    Under TestClient every call shares one IP key; disabling avoids cross-test
    flakiness. Restored after each test.
    """
    from core.limiter import limiter

    prev = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = prev


@pytest.fixture
def as_customer(client):
    """Override auth as a fixed customer and clean up afterwards."""
    client.app.dependency_overrides[get_current_user] = lambda: {
        "id": "cust1",
        "email": "cust1@example.com",
        "access_token": "tok",
        "profile": {"name": "Cust One", "phone": "9999999999"},
    }
    yield client
    client.app.dependency_overrides = {}


def _err_code(response) -> str:
    return response.json()["error"]["details"]["code"]


# ---------------------------------------------------------------------------
# Production default: the flag is OFF unless an Admin enables it server-side.
# ---------------------------------------------------------------------------


def test_default_flag_is_disabled():
    """The shipped default MUST be disabled (Req 4.2, 4.3) — no monkeypatch."""
    assert settings.PAYU_PAYOUTS_ENABLED is False
    assert payu_payouts_enabled() is False


# ---------------------------------------------------------------------------
# create-order — 403 + zero Supabase/PayU contact (Req 4.5, 6.6, 14.4, 14.5)
# ---------------------------------------------------------------------------


def test_create_order_flag_off_403_and_no_contact(
    as_customer, mock_supabase, monkeypatch
):
    # Flag is OFF by default — do NOT enable it. No Supabase route is registered:
    # any DB call would raise an unmocked-request error instead of 403.
    called = {"payu": False}
    monkeypatch.setattr(
        "routers.payments.payu_service.build_payment_params",
        lambda **kw: called.__setitem__("payu", True) or {},
    )

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k-off-1"},
    )

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "ONLINE_PAYMENT_DISABLED"
    # No PayU order was built and (respx) no Supabase request was made → the
    # bookings table is never read, so pay-at-salon/booking is untouched.
    assert called["payu"] is False
    assert not mock_supabase.calls


# ---------------------------------------------------------------------------
# verify — 403 (Req 4.5, 8.6)
# ---------------------------------------------------------------------------


def test_verify_flag_off_403(client):
    resp = client.post(
        "/api/v1/payments/verify",
        json={"txnid": "t1", "status": "success", "hash": "x"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "ONLINE_PAYMENT_DISABLED"


# ---------------------------------------------------------------------------
# webhook — 200 ignored, does nothing (Req 10.4)
# ---------------------------------------------------------------------------


def test_webhook_flag_off_ignored(client, mock_supabase):
    resp = client.post(
        "/api/v1/payments/webhook",
        json={"event": "payment.captured"},
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"status": "ignored"}
    # Did nothing: no Supabase contact (no audit row, no state change).
    assert not mock_supabase.calls


# ---------------------------------------------------------------------------
# refund — 403 + zero Supabase/PayU contact (Req 4.5, 11.2, 14.4, 14.5)
# ---------------------------------------------------------------------------


def test_refund_flag_off_403_and_no_contact(
    as_customer, mock_supabase, monkeypatch
):
    called = {"payu": False}
    monkeypatch.setattr(
        "routers.payments.payu_service.create_refund",
        lambda **kw: called.__setitem__("payu", True) or {},
    )

    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "p1"},
        headers={"Idempotency-Key": "k-off-refund-1"},
    )

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "ONLINE_PAYMENT_DISABLED"
    assert called["payu"] is False
    assert not mock_supabase.calls


# ---------------------------------------------------------------------------
# Split reconciliation sanity (Req 7.5) — exhaustive coverage in test_commission.py
# ---------------------------------------------------------------------------


def test_split_reconciliation_sanity():
    """compute_split output reconciles exactly (zero residual), integer paise."""
    split = compute_split(10000, 5.0, 2.0)
    assert (
        split["commission_paise"]
        + split["payu_fee_paise"]
        + split["vendor_paise"]
        == split["amount_paise"]
        == 10000
    )
    for key in ("commission_paise", "payu_fee_paise", "vendor_paise"):
        assert isinstance(split[key], int)
        assert split[key] >= 0
