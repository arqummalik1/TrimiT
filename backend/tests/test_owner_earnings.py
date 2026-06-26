"""Tests for Task 18 — owner earnings + settlement view (`/api/v1/owner/earnings`).

Covers owner-only access control, server-side tenancy resolution, and the
settlement-honesty aggregates: a ``paid`` payment that has not settled yet is
counted in ``total_pending_settlement_paise`` and NEVER in
``total_settled_paise`` (Req 16.4, 16.5). Tenancy is scoped to the caller's own
salon (Req 12.2).

All Supabase REST traffic is intercepted by respx (see ``mock_supabase`` in
conftest) — no real network.
"""

from fastapi import status
from httpx import Response

EARNINGS_URL = "/api/v1/owner/earnings"

OWNER_USER = {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}}
CUSTOMER_USER = {"id": "cust1", "access_token": "tok", "profile": {"role": "customer"}}

# A settled payment: salon net 9300 paise, already transferred to the bank.
SETTLED_PAYMENT = {
    "id": "pay-settled",
    "booking_id": "book-1",
    "amount_paise": 10000,
    "commission_paise": 500,
    "payu_fee_paise": 200,
    "vendor_paise": 9300,
    "payment_status": "paid",
    "settlement_status": "settled",
    "created_at": "2024-02-02T00:00:00Z",
}

# A paid-but-pending-settlement payment: customer paid, money NOT yet in bank.
PAID_PENDING_PAYMENT = {
    "id": "pay-pending",
    "booking_id": "book-2",
    "amount_paise": 20000,
    "commission_paise": 1000,
    "payu_fee_paise": 400,
    "vendor_paise": 18600,
    "payment_status": "paid",
    "settlement_status": "pending",
    "created_at": "2024-02-01T00:00:00Z",
}


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


# ---------------------------------------------------------------------------
# 1. Auth required — no identity, no access
# ---------------------------------------------------------------------------


def test_earnings_requires_auth(client):
    response = client.get(EARNINGS_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# 2. Non-owner role rejected with structured FORBIDDEN_NOT_OWNER (Req 12.2)
# ---------------------------------------------------------------------------


def test_non_owner_forbidden(client, mock_supabase):
    app = client.app
    _override_user(app, CUSTOMER_USER)
    try:
        response = client.get(EARNINGS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["details"]["code"] == "FORBIDDEN_NOT_OWNER"
        # No Supabase read should have occurred.
        assert not mock_supabase.calls
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 3. Owner with no salon → empty list + zeroed summary (200, documented)
# ---------------------------------------------------------------------------


def test_owner_no_salon_returns_empty(client, mock_supabase):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        mock_supabase.get("/rest/v1/salons").mock(return_value=Response(200, json=[]))
        response = client.get(EARNINGS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["summary"]["total_earned_paise"] == 0
        assert data["summary"]["total_settled_paise"] == 0
        assert data["summary"]["total_pending_settlement_paise"] == 0
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 4. Owner happy path — items returned + aggregates keep settled vs pending
#    explicit (Req 16.4, 16.5)
# ---------------------------------------------------------------------------


def test_owner_happy_path_aggregates(client, mock_supabase):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        mock_supabase.get("/rest/v1/salons").mock(
            return_value=Response(200, json=[{"id": "s1"}])
        )
        mock_supabase.get("/rest/v1/payments").mock(
            return_value=Response(200, json=[SETTLED_PAYMENT, PAID_PENDING_PAYMENT])
        )

        response = client.get(EARNINGS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Both payments are returned with their verbatim settlement_status.
        assert len(data["items"]) == 2
        by_id = {item["payment_id"]: item for item in data["items"]}
        assert by_id["pay-settled"]["settlement_status"] == "settled"
        assert by_id["pay-pending"]["settlement_status"] == "pending"
        # Item shape carries the net + booking_id projection.
        assert by_id["pay-pending"]["vendor_paise"] == 18600
        assert by_id["pay-pending"]["booking_id"] == "book-2"

        summary = data["summary"]
        # Both paid → both earned: 9300 + 18600.
        assert summary["total_earned_paise"] == 9300 + 18600
        # Only the settled payment counts as money in the bank.
        assert summary["total_settled_paise"] == 9300
        # The paid-but-pending payment is pending settlement, never settled.
        assert summary["total_pending_settlement_paise"] == 18600
        # Explicit guard: the pending net is NOT in the settled total.
        assert PAID_PENDING_PAYMENT["vendor_paise"] not in (summary["total_settled_paise"],)
    finally:
        app.dependency_overrides = {}
