"""Tests for POST /payments/create-order (Task 12 — PayU online payment init).

Covers the guard chain and happy path:
- auth required (401)
- flag OFF → ONLINE_PAYMENT_DISABLED, no PayU contact, no payment row
- missing Idempotency-Key → IDEMPOTENCY_KEY_REQUIRED
- booking not found → 404 / not owned → 403
- salon vendor not active → SALON_NOT_PAYOUT_READY (no PayU)
- booking already paid → BOOKING_ALREADY_PAID
- >3 attempts → PAYMENT_RETRY_LIMIT
- happy path → pending payment row + PayU params returned + split reconciles
- PayU setup failure → payment marked failed + PAYU_ORDER_FAILED
- idempotent replay (same key+booking) vs conflict (same key, different booking)

The feature flag and PayU service are monkeypatched; Supabase is respx-mocked.
The respx fixture asserts every registered route IS called, so each test
registers ONLY the Supabase routes it expects to hit — an unexpected request to
an unregistered route raises, which itself proves a guard short-circuited.

Money: bookings store amount in RUPEES; the router converts to integer paise
(₹100 → 10000 paise).
"""

import json

import pytest
from fastapi import status
from httpx import Response

from dependencies.auth import get_current_user


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    """Disable the shared in-memory rate limiter for this module.

    Many create-order calls share one IP key under TestClient; without this the
    10/min limit would flake across tests. Restored after each test.
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


def _enable_flag(monkeypatch):
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: True)


def _patch_commission(monkeypatch, percent: float = 5.0):
    async def _fake():
        return percent

    monkeypatch.setattr("routers.payments.get_commission_percent", _fake)


def _err_code(response) -> str:
    return response.json()["error"]["details"]["code"]


def _idem_get(mock_supabase, existing=None):
    return mock_supabase.get(url__regex=r".*/rest/v1/idempotency_keys.*").mock(
        return_value=Response(200, json=existing or [])
    )


def _idem_post(mock_supabase):
    return mock_supabase.post(url__regex=r".*/rest/v1/idempotency_keys.*").mock(
        return_value=Response(201, json=[{}])
    )


def _booking_get(mock_supabase, *, user_id="cust1", amount=100, salon_id="s1"):
    return mock_supabase.get(url__regex=r".*/rest/v1/bookings.*").mock(
        return_value=Response(
            200,
            json=[
                {
                    "id": "b1",
                    "user_id": user_id,
                    "salon_id": salon_id,
                    "amount": amount,
                    "status": "pending",
                }
            ],
        )
    )


def _payments_get(mock_supabase, rows):
    return mock_supabase.get(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(200, json=rows)
    )


def _vendor_get(mock_supabase, vendor_status="active", vendor_id="payu_v1"):
    return mock_supabase.get(url__regex=r".*/rest/v1/salon_bank_accounts.*").mock(
        return_value=Response(
            200, json=[{"vendor_status": vendor_status, "payu_vendor_id": vendor_id}]
        )
    )


def _payments_post(mock_supabase, payment_id="pay_1"):
    return mock_supabase.post(url__regex=r".*/rest/v1/payments(\?.*)?$").mock(
        return_value=Response(201, json=[{"id": payment_id}])
    )


# ---------------------------------------------------------------------------
# Auth + flag gating
# ---------------------------------------------------------------------------


def test_create_order_requires_auth(client):
    resp = client.post("/api/v1/payments/create-order", json={"booking_id": "b1"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_flag_off_disables_online_payment_and_contacts_no_payu(
    as_customer, mock_supabase, monkeypatch
):
    # Flag is OFF by default — do NOT enable it. No Supabase route is registered:
    # the endpoint must short-circuit before any DB or PayU call.
    called = {"build": False}
    monkeypatch.setattr(
        "routers.payments.payu_service.build_payment_params",
        lambda **kw: called.__setitem__("build", True) or {},
    )

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "ONLINE_PAYMENT_DISABLED"
    assert called["build"] is False


# ---------------------------------------------------------------------------
# Idempotency-Key required
# ---------------------------------------------------------------------------


def test_missing_idempotency_key_rejected(as_customer, monkeypatch):
    _enable_flag(monkeypatch)
    resp = as_customer.post(
        "/api/v1/payments/create-order", json={"booking_id": "b1"}
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "IDEMPOTENCY_KEY_REQUIRED"


# ---------------------------------------------------------------------------
# Booking ownership
# ---------------------------------------------------------------------------


def test_booking_not_found(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    mock_supabase.get(url__regex=r".*/rest/v1/bookings.*").mock(
        return_value=Response(200, json=[])
    )
    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert _err_code(resp) == "BOOKING_NOT_FOUND"


def test_booking_not_owned(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _booking_get(mock_supabase, user_id="someone_else")
    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "BOOKING_FORBIDDEN"


# ---------------------------------------------------------------------------
# Already paid / retry cap
# ---------------------------------------------------------------------------


def test_booking_already_paid(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _booking_get(mock_supabase)
    _payments_get(
        mock_supabase, [{"id": "p0", "payment_status": "paid", "attempt_count": 1}]
    )
    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert _err_code(resp) == "BOOKING_ALREADY_PAID"


def test_payment_retry_limit(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _booking_get(mock_supabase)
    _payments_get(
        mock_supabase,
        [
            {"id": "p1", "payment_status": "failed", "attempt_count": 1},
            {"id": "p2", "payment_status": "failed", "attempt_count": 2},
            {"id": "p3", "payment_status": "failed", "attempt_count": 3},
        ],
    )
    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert _err_code(resp) == "PAYMENT_RETRY_LIMIT"


# ---------------------------------------------------------------------------
# Vendor readiness
# ---------------------------------------------------------------------------


def test_salon_not_payout_ready_creates_no_order(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _patch_commission(monkeypatch)
    _idem_get(mock_supabase)
    _booking_get(mock_supabase)
    _payments_get(mock_supabase, [])
    _vendor_get(mock_supabase, vendor_status="pending")

    called = {"build": False}
    monkeypatch.setattr(
        "routers.payments.payu_service.build_payment_params",
        lambda **kw: called.__setitem__("build", True) or {},
    )
    # No payments POST route is registered: if the endpoint tried to create a
    # payment it would hit an unmocked route and fail — proving none was created.

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert _err_code(resp) == "SALON_NOT_PAYOUT_READY"
    assert called["build"] is False


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_create_order_happy_path(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _patch_commission(monkeypatch, 5.0)
    _idem_get(mock_supabase)
    _idem_post(mock_supabase)
    _booking_get(mock_supabase, amount=100)  # ₹100 -> 10000 paise
    _payments_get(mock_supabase, [])
    _vendor_get(mock_supabase, vendor_status="active", vendor_id="payu_v1")
    create_payment = _payments_post(mock_supabase)

    captured = {}

    def _fake_build(**kwargs):
        captured.update(kwargs)
        return {
            "key": "test_key",
            "txnid": kwargs["txnid"],
            "amount": "100.00",
            "hash": "deadbeef",
            "surl": kwargs["success_url"],
            "furl": kwargs["failure_url"],
        }

    monkeypatch.setattr(
        "routers.payments.payu_service.build_payment_params", _fake_build
    )

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_id"] == "pay_1"
    assert body["payment_status"] == "pending"
    assert body["amount_paise"] == 10000
    assert body["payu"]["hash"] == "deadbeef"
    assert body["payu"]["txnid"]  # unique txnid present

    # PayU received the split with the salon's vendor id and the paise amount.
    assert captured["split"]["payu_vendor_id"] == "payu_v1"
    assert captured["amount_paise"] == 10000
    # surl/furl derive from PUBLIC_SITE_URL.
    assert captured["success_url"].endswith("/payment/callback")

    # Payment row created as pending, split reconciles to the amount exactly.
    assert create_payment.called
    payload = json.loads(create_payment.calls.last.request.content)
    assert payload["payment_status"] == "pending"
    assert payload["settlement_status"] == "pending"
    assert payload["attempt_count"] == 1
    assert payload["payu_order_id"] == body["payu"]["txnid"]
    assert payload["amount_paise"] == 10000
    assert payload["commission_paise"] == 500  # 5% of 10000
    assert payload["payu_fee_paise"] == 200  # 2% of 10000
    assert payload["vendor_paise"] == 9300
    assert (
        payload["commission_paise"]
        + payload["payu_fee_paise"]
        + payload["vendor_paise"]
        == payload["amount_paise"]
    )


def test_payu_order_failure_marks_payment_failed(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _patch_commission(monkeypatch)
    _idem_get(mock_supabase)
    _booking_get(mock_supabase)
    _payments_get(mock_supabase, [])
    _vendor_get(mock_supabase, vendor_status="active")
    _payments_post(mock_supabase)
    patch_payment = mock_supabase.patch(url__regex=r".*/rest/v1/payments.*").mock(
        return_value=Response(200, json=[{"id": "pay_1"}])
    )

    def _boom(**kwargs):
        raise RuntimeError("PayU credentials not configured")

    monkeypatch.setattr("routers.payments.payu_service.build_payment_params", _boom)

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_502_BAD_GATEWAY
    assert _err_code(resp) == "PAYU_ORDER_FAILED"
    # Payment was marked failed.
    assert patch_payment.called
    patched = json.loads(patch_payment.calls.last.request.content)
    assert patched["payment_status"] == "failed"


# ---------------------------------------------------------------------------
# Idempotent replay vs conflict
# ---------------------------------------------------------------------------


def test_idempotent_replay_returns_existing(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    stored_body = {
        "payment_id": "pay_1",
        "booking_id": "b1",
        "amount_paise": 10000,
        "currency": "INR",
        "payment_status": "pending",
        "payu": {"txnid": "abc", "hash": "h"},
    }
    _idem_get(
        mock_supabase,
        existing=[{"response_status": 200, "response_body": stored_body}],
    )
    monkeypatch.setattr(
        "routers.payments.payu_service.build_payment_params",
        lambda **kw: pytest.fail("PayU must not be called on replay"),
    )
    # No payments POST route registered: a replay must not create a new payment.

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["payment_id"] == "pay_1"
    assert resp.headers.get("X-Idempotency-Hit") == "true"


def test_idempotency_conflict_on_different_booking(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    stored_body = {"payment_id": "pay_1", "booking_id": "b_other"}
    _idem_get(
        mock_supabase,
        existing=[{"response_status": 200, "response_body": stored_body}],
    )

    resp = as_customer.post(
        "/api/v1/payments/create-order",
        json={"booking_id": "b1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert _err_code(resp) == "IDEMPOTENCY_CONFLICT"
