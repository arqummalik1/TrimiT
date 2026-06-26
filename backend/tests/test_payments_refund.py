"""Tests for POST /payments/refund (Task 16 — full/partial refund, Req 11, 13.6/13.7).

Covers the guard chain, money math, and idempotency:
- flag OFF → ONLINE_PAYMENT_DISABLED, no PayU/DB contact
- missing Idempotency-Key → IDEMPOTENCY_KEY_REQUIRED
- payment not found → 404
- caller not authorized (not customer, not salon owner) → 403 REFUND_FORBIDDEN
- payment not paid/partially_refunded → 400 REFUND_NOT_ALLOWED
- full refund happy path → refund completed + payment 'refunded'
- partial refund → refund completed + payment 'partially_refunded'
- amount exceeds remaining (after prior refunds) → 400 REFUND_AMOUNT_EXCEEDS
- PayU failure → refund 'failed' + 502 REFUND_FAILED + payment status unchanged
- idempotent replay (same key + same payment) → stored result, no PayU/DB work

The feature flag and ``payu_service.create_refund`` are monkeypatched; Supabase
is respx-mocked. The respx fixture asserts every registered route IS called, so
each test registers ONLY the Supabase routes it expects to hit — an unexpected
request to an unregistered route raises, proving a guard short-circuited.

Money: all amounts are integer paise (₹100 == 10000 paise).
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
    """Disable the shared in-memory rate limiter so refund calls don't flake."""
    from core.limiter import limiter

    prev = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = prev


@pytest.fixture
def as_customer(client):
    """Override auth as the customer who owns the payment (id == 'cust1')."""
    client.app.dependency_overrides[get_current_user] = lambda: {
        "id": "cust1",
        "email": "cust1@example.com",
        "access_token": "tok",
        "profile": {"name": "Cust One", "phone": "9999999999"},
    }
    yield client
    client.app.dependency_overrides = {}


@pytest.fixture
def as_owner(client):
    """Override auth as a salon owner (id == 'owner1'), not the payment's customer."""
    client.app.dependency_overrides[get_current_user] = lambda: {
        "id": "owner1",
        "email": "owner1@example.com",
        "access_token": "tok",
        "profile": {"name": "Owner One"},
    }
    yield client
    client.app.dependency_overrides = {}


@pytest.fixture
def as_stranger(client):
    """Override auth as a user who is neither the customer nor the salon owner."""
    client.app.dependency_overrides[get_current_user] = lambda: {
        "id": "stranger1",
        "email": "stranger@example.com",
        "access_token": "tok",
        "profile": {"name": "Nobody"},
    }
    yield client
    client.app.dependency_overrides = {}


def _enable_flag(monkeypatch):
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: True)


def _patch_refund(monkeypatch, result):
    """Monkeypatch payu_service.create_refund to return ``result`` (or raise)."""

    async def _fake(payu_payment_id, amount_paise, txnid):
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr("routers.payments.payu_service.create_refund", _fake)


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


def _payment_get(
    mock_supabase,
    *,
    user_id="cust1",
    salon_id="s1",
    payment_status="paid",
    amount_paise=10000,
    payment_id="pay_1",
):
    return mock_supabase.get(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(
            200,
            json=[
                {
                    "id": payment_id,
                    "user_id": user_id,
                    "salon_id": salon_id,
                    "payment_status": payment_status,
                    "payu_payment_id": "mihpay_1",
                    "payu_order_id": "txn_1",
                    "amount_paise": amount_paise,
                }
            ],
        )
    )


def _payment_not_found(mock_supabase):
    return mock_supabase.get(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(200, json=[])
    )


def _salon_get(mock_supabase, owner_id="owner1"):
    return mock_supabase.get(url__regex=r".*/rest/v1/salons\?.*").mock(
        return_value=Response(200, json=[{"owner_id": owner_id}])
    )


def _refunds_get(mock_supabase, rows=None):
    return mock_supabase.get(url__regex=r".*/rest/v1/refunds\?.*").mock(
        return_value=Response(200, json=rows or [])
    )


def _refunds_post(mock_supabase, refund_id="ref_1"):
    return mock_supabase.post(url__regex=r".*/rest/v1/refunds(\?.*)?$").mock(
        return_value=Response(201, json=[{"id": refund_id}])
    )


def _refunds_patch(mock_supabase):
    return mock_supabase.patch(url__regex=r".*/rest/v1/refunds\?.*").mock(
        return_value=Response(200, json=[{"id": "ref_1"}])
    )


def _payments_patch(mock_supabase):
    return mock_supabase.patch(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(200, json=[{"id": "pay_1"}])
    )


# ---------------------------------------------------------------------------
# Auth + flag gating
# ---------------------------------------------------------------------------


def test_refund_requires_auth(client):
    resp = client.post("/api/v1/payments/refund", json={"payment_id": "pay_1"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_flag_off_disables_refund(as_customer, monkeypatch):
    # Flag OFF by default. No Supabase route registered → must short-circuit.
    called = {"refund": False}

    async def _fake(*a, **k):
        called["refund"] = True
        return {}

    monkeypatch.setattr("routers.payments.payu_service.create_refund", _fake)

    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "ONLINE_PAYMENT_DISABLED"
    assert called["refund"] is False


# ---------------------------------------------------------------------------
# Idempotency-Key required
# ---------------------------------------------------------------------------


def test_missing_idempotency_key_rejected(as_customer, monkeypatch):
    _enable_flag(monkeypatch)
    resp = as_customer.post(
        "/api/v1/payments/refund", json={"payment_id": "pay_1"}
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "IDEMPOTENCY_KEY_REQUIRED"


# ---------------------------------------------------------------------------
# Payment lookup + authorization
# ---------------------------------------------------------------------------


def test_payment_not_found(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _payment_not_found(mock_supabase)
    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert _err_code(resp) == "PAYMENT_NOT_FOUND"


def test_refund_forbidden_for_stranger(as_stranger, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _payment_get(mock_supabase, user_id="cust1", salon_id="s1")
    # Caller is neither customer nor owner → salon owner lookup returns owner1.
    _salon_get(mock_supabase, owner_id="owner1")
    resp = as_stranger.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "REFUND_FORBIDDEN"


def test_owner_can_refund_own_salon_payment(as_owner, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _idem_post(mock_supabase)
    _payment_get(mock_supabase, user_id="cust1", salon_id="s1", amount_paise=10000)
    _salon_get(mock_supabase, owner_id="owner1")  # caller owns the salon
    _refunds_get(mock_supabase, [])
    _refunds_post(mock_supabase)
    _refunds_patch(mock_supabase)
    _payments_patch(mock_supabase)
    _patch_refund(
        monkeypatch, {"refund_status": "completed", "payu_refund_id": "pref_1"}
    )

    resp = as_owner.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "refunded"


# ---------------------------------------------------------------------------
# Refundable state
# ---------------------------------------------------------------------------


def test_refund_not_allowed_when_not_paid(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _payment_get(mock_supabase, payment_status="pending")
    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "REFUND_NOT_ALLOWED"


# ---------------------------------------------------------------------------
# Full / partial happy paths
# ---------------------------------------------------------------------------


def test_full_refund_marks_payment_refunded(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _idem_post(mock_supabase)
    _payment_get(mock_supabase, amount_paise=10000)
    _refunds_get(mock_supabase, [])  # no prior refunds
    refund_post = _refunds_post(mock_supabase)
    refund_patch = _refunds_patch(mock_supabase)
    payment_patch = _payments_patch(mock_supabase)
    _patch_refund(
        monkeypatch, {"refund_status": "completed", "payu_refund_id": "pref_1"}
    )

    # amount_paise omitted → full remaining refund.
    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["refund_id"] == "ref_1"
    assert body["refund_status"] == "completed"
    assert body["payment_status"] == "refunded"
    assert body["amount_paise"] == 10000

    # Refund row created as initiated with the full amount.
    created = json.loads(refund_post.calls.last.request.content)
    assert created["refund_status"] == "initiated"
    assert created["amount_paise"] == 10000
    assert created["payment_id"] == "pay_1"

    # Refund row updated to completed with the PayU refund id.
    patched_refund = json.loads(refund_patch.calls.last.request.content)
    assert patched_refund["refund_status"] == "completed"
    assert patched_refund["payu_refund_id"] == "pref_1"

    # Payment status updated to refunded.
    patched_payment = json.loads(payment_patch.calls.last.request.content)
    assert patched_payment["payment_status"] == "refunded"


def test_partial_refund_marks_payment_partially_refunded(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _idem_post(mock_supabase)
    _payment_get(mock_supabase, amount_paise=10000)
    _refunds_get(mock_supabase, [])
    _refunds_post(mock_supabase)
    _refunds_patch(mock_supabase)
    payment_patch = _payments_patch(mock_supabase)
    _patch_refund(
        monkeypatch, {"refund_status": "completed", "payu_refund_id": "pref_1"}
    )

    # Refund only 4000 of 10000 paise.
    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1", "amount_paise": 4000},
        headers={"Idempotency-Key": "k1"},
    )

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["refund_status"] == "completed"
    assert body["payment_status"] == "partially_refunded"
    assert body["amount_paise"] == 4000

    patched_payment = json.loads(payment_patch.calls.last.request.content)
    assert patched_payment["payment_status"] == "partially_refunded"


# ---------------------------------------------------------------------------
# Amount exceeds remaining (accounting for prior refunds)
# ---------------------------------------------------------------------------


def test_refund_amount_exceeds_remaining(as_customer, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    # Payment of 10000 with a prior completed refund of 7000 → 3000 remaining.
    _payment_get(mock_supabase, amount_paise=10000, payment_status="partially_refunded")
    _refunds_get(
        mock_supabase,
        [{"amount_paise": 7000, "refund_status": "completed"}],
    )
    # No refunds POST registered: request must be rejected before any row is made.

    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1", "amount_paise": 5000},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "REFUND_AMOUNT_EXCEEDS"


# ---------------------------------------------------------------------------
# PayU failure
# ---------------------------------------------------------------------------


def test_payu_refund_failure_marks_refund_failed_and_keeps_payment(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _idem_get(mock_supabase)
    _payment_get(mock_supabase, amount_paise=10000, payment_status="paid")
    _refunds_get(mock_supabase, [])
    _refunds_post(mock_supabase)
    refund_patch = _refunds_patch(mock_supabase)
    # No payments PATCH registered: payment status must NOT change on failure.

    _patch_refund(monkeypatch, {"refund_status": "failed", "raw": {"error": "x"}})

    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_502_BAD_GATEWAY
    assert _err_code(resp) == "REFUND_FAILED"

    # Refund row marked failed.
    patched_refund = json.loads(refund_patch.calls.last.request.content)
    assert patched_refund["refund_status"] == "failed"


# ---------------------------------------------------------------------------
# Idempotent replay
# ---------------------------------------------------------------------------


def test_idempotent_replay_returns_stored_result(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    stored_body = {
        "refund_id": "ref_1",
        "refund_status": "completed",
        "payment_status": "refunded",
        "amount_paise": 10000,
        "payment_id": "pay_1",
    }
    _idem_get(
        mock_supabase,
        existing=[{"response_status": 200, "response_body": stored_body}],
    )

    async def _must_not_call(*a, **k):
        pytest.fail("PayU must not be called on idempotent replay")

    monkeypatch.setattr("routers.payments.payu_service.create_refund", _must_not_call)
    # No payment/refund routes registered: a replay must not touch them.

    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["refund_id"] == "ref_1"
    assert resp.headers.get("X-Idempotency-Hit") == "true"


def test_idempotency_conflict_on_different_payment(
    as_customer, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    stored_body = {"refund_id": "ref_1", "payment_id": "pay_other"}
    _idem_get(
        mock_supabase,
        existing=[{"response_status": 200, "response_body": stored_body}],
    )

    resp = as_customer.post(
        "/api/v1/payments/refund",
        json={"payment_id": "pay_1"},
        headers={"Idempotency-Key": "k1"},
    )
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert _err_code(resp) == "IDEMPOTENCY_CONFLICT"
