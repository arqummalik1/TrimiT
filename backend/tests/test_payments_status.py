"""Tests for GET /payments/status (Task 15 — caller-scoped payment status).

Covers Req 9.1, 9.2, 9.5, 12.1:
- auth required (401)
- missing query (no booking_id / order_id) → 400 MISSING_QUERY
- unknown / none-owned → 200 {"status": "unknown"} (backwards-compat contract)
- owned paid payment → payment_status 'paid' + settlement_status + can_retry False
- owned failed payment, attempt_count 1 → can_retry True
- owned failed payment, attempt_count 3 → can_retry False
- a payment owned by ANOTHER user is NOT returned → 200 {"status": "unknown"}
  (the DB lookup is filtered by user_id, so an un-owned row simply never matches)

The auth dependency is overridden as a fixed customer; Supabase is respx-mocked.
The respx fixture asserts every registered route IS called, so each test
registers ONLY the Supabase route it expects to hit.
"""

import pytest
from fastapi import status
from httpx import Response

from dependencies.auth import get_current_user


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


@pytest.fixture
def as_customer(client):
    """Override auth as a fixed customer (id 'cust1') and clean up afterwards."""
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


def _payments_get(mock_supabase, rows):
    """Mock the caller-scoped payments lookup, returning the given rows."""
    return mock_supabase.get(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(200, json=rows)
    )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def test_status_requires_auth(client):
    resp = client.get("/api/v1/payments/status?order_id=txn_abc")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Missing query
# ---------------------------------------------------------------------------


def test_missing_query_rejected(as_customer):
    # No booking_id and no order_id → 400 MISSING_QUERY. No DB route registered:
    # the endpoint must short-circuit before any Supabase call.
    resp = as_customer.get("/api/v1/payments/status")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "MISSING_QUERY"


# ---------------------------------------------------------------------------
# Unknown / none-owned → 200 {"status": "unknown"} (backwards-compat)
# ---------------------------------------------------------------------------


def test_unknown_order_returns_unknown(as_customer, mock_supabase):
    _payments_get(mock_supabase, [])
    resp = as_customer.get("/api/v1/payments/status?order_id=txn_missing")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"status": "unknown"}


def test_payment_owned_by_another_user_returns_unknown(as_customer, mock_supabase):
    # The lookup is filtered by user_id=eq.cust1 at the DB layer, so a payment
    # owned by another user never matches → the mock returns [] and the caller
    # gets the benign 'unknown' without learning the payment exists (Req 12.1).
    _payments_get(mock_supabase, [])
    resp = as_customer.get("/api/v1/payments/status?booking_id=b_other_user")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"status": "unknown"}


# ---------------------------------------------------------------------------
# Owned payments → full status + derived can_retry
# ---------------------------------------------------------------------------


def test_owned_paid_payment_can_retry_false(as_customer, mock_supabase):
    _payments_get(
        mock_supabase,
        [
            {
                "payment_status": "paid",
                "settlement_status": "pending",
                "booking_id": "b1",
                "amount_paise": 10000,
                "attempt_count": 1,
            }
        ],
    )
    resp = as_customer.get("/api/v1/payments/status?booking_id=b1")
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "paid"
    assert body["settlement_status"] == "pending"
    assert body["booking_id"] == "b1"
    assert body["amount_paise"] == 10000
    assert body["can_retry"] is False


def test_owned_failed_payment_attempt1_can_retry_true(as_customer, mock_supabase):
    _payments_get(
        mock_supabase,
        [
            {
                "payment_status": "failed",
                "settlement_status": "pending",
                "booking_id": "b1",
                "amount_paise": 10000,
                "attempt_count": 1,
            }
        ],
    )
    resp = as_customer.get("/api/v1/payments/status?booking_id=b1")
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "failed"
    assert body["attempt_count"] == 1
    assert body["can_retry"] is True


def test_owned_failed_payment_attempt3_can_retry_false(as_customer, mock_supabase):
    _payments_get(
        mock_supabase,
        [
            {
                "payment_status": "failed",
                "settlement_status": "pending",
                "booking_id": "b1",
                "amount_paise": 10000,
                "attempt_count": 3,
            }
        ],
    )
    resp = as_customer.get("/api/v1/payments/status?booking_id=b1")
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "failed"
    assert body["attempt_count"] == 3
    assert body["can_retry"] is False


def test_lookup_by_order_id_backward_compat(as_customer, mock_supabase):
    # Old clients call with ?order_id=<payu txnid>; it must still work.
    _payments_get(
        mock_supabase,
        [
            {
                "payment_status": "pending",
                "settlement_status": "pending",
                "booking_id": "b1",
                "amount_paise": 10000,
                "attempt_count": 1,
            }
        ],
    )
    resp = as_customer.get("/api/v1/payments/status?order_id=txn_abc")
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "pending"
    # pending (not failed/paid) → not retryable yet.
    assert body["can_retry"] is False
