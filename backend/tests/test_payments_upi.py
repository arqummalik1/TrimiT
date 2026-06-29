"""Router tests for the UPI-intent + manual-verification payment flow
(routers/payments.py). Supabase REST is mocked with respx; push notifications
are monkeypatched to no-ops so we test ONLY the endpoint logic.
"""

import pytest
from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def _customer(app, uid="cust1"):
    _override_user(app, {"id": uid, "email": "c@x.com", "access_token": "tok",
                         "profile": {"role": "customer", "name": "Cust"}})


def _owner(app, uid="owner1"):
    _override_user(app, {"id": uid, "email": "o@x.com", "access_token": "tok",
                         "profile": {"role": "owner", "name": "Owner"}})


def _booking(**over):
    row = {
        "id": "b1", "user_id": "cust1", "salon_id": "s1", "amount": 499,
        "status": "pending", "payment_method": "upi", "payment_status": "pending",
        "payment_verification_status": "initiated", "booking_reference": None,
        "expected_upi_id": None, "booking_date": "2026-07-01", "time_slot": "10:00",
        "verified_by": None,
        "salons": {"id": "s1", "owner_id": "owner1", "name": "Glow", "upi_id": "glow@okaxis"},
        "services": {"name": "Haircut"},
    }
    row.update(over)
    return row


@pytest.fixture(autouse=True)
def _silence_push(monkeypatch):
    """Stop the endpoints' notification calls from hitting Supabase."""
    from routers import payments as pay

    async def _noop(*a, **k):
        return None

    monkeypatch.setattr(pay.booking_push, "after_upi_awaiting_verification", _noop)
    monkeypatch.setattr(pay.booking_push, "after_payment_confirmed", _noop)
    monkeypatch.setattr(pay.booking_push, "after_payment_rejected", _noop)
    monkeypatch.setattr(pay.booking_push, "fetch_user_name", _noop)


# ── initiate ─────────────────────────────────────────────────────────────────

def test_initiate_returns_reference_and_intent(client, mock_supabase):
    app = client.app
    _customer(app)
    try:
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[_booking()]))
        mock_supabase.patch("/rest/v1/bookings").mock(return_value=Response(204))
        resp = client.post("/api/v1/payments/upi/initiate", json={"booking_id": "b1"})
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert body["payment_verification_status"] == "initiated"
        assert body["booking_reference"].startswith("TRM-")
        assert body["upi"]["intent_uri"].startswith("upi://pay?")
        assert "waiting for the salon" in body["message"].lower()
    finally:
        app.dependency_overrides = {}


def test_initiate_forbidden_for_other_user(client, mock_supabase):
    app = client.app
    _customer(app, "someone_else")
    try:
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[_booking()]))
        resp = client.post("/api/v1/payments/upi/initiate", json={"booking_id": "b1"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert resp.json()["error"]["details"]["code"] == "BOOKING_FORBIDDEN"
    finally:
        app.dependency_overrides = {}


def test_initiate_rejects_non_upi_booking(client, mock_supabase):
    app = client.app
    _customer(app)
    try:
        mock_supabase.get("/rest/v1/bookings").mock(
            return_value=Response(200, json=[_booking(payment_method="salon_cash")])
        )
        resp = client.post("/api/v1/payments/upi/initiate", json={"booking_id": "b1"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.json()["error"]["details"]["code"] == "NOT_A_UPI_BOOKING"
    finally:
        app.dependency_overrides = {}


def test_initiate_salon_without_upi(client, mock_supabase):
    app = client.app
    _customer(app)
    try:
        b = _booking()
        b["salons"]["upi_id"] = ""
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[b]))
        resp = client.post("/api/v1/payments/upi/initiate", json={"booking_id": "b1"})
        assert resp.status_code == status.HTTP_409_CONFLICT
        assert resp.json()["error"]["details"]["code"] == "SALON_UPI_UNAVAILABLE"
    finally:
        app.dependency_overrides = {}


# ── awaiting verification ────────────────────────────────────────────────────

def test_awaiting_sets_waiting_status(client, mock_supabase):
    app = client.app
    _customer(app)
    try:
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[_booking()]))
        mock_supabase.patch("/rest/v1/bookings").mock(return_value=Response(204))
        resp = client.post("/api/v1/payments/upi/awaiting-verification", json={"booking_id": "b1"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["payment_verification_status"] == "waiting_verification"
    finally:
        app.dependency_overrides = {}


# ── owner verify (single action) ─────────────────────────────────────────────

def test_owner_verify_confirms_booking(client, mock_supabase):
    app = client.app
    _owner(app, "owner1")
    try:
        mock_supabase.get("/rest/v1/bookings").mock(
            return_value=Response(200, json=[_booking(payment_verification_status="waiting_verification")])
        )
        mock_supabase.patch("/rest/v1/bookings").mock(return_value=Response(204))
        resp = client.post("/api/v1/payments/b1/verify", json={})
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        assert body["payment_verification_status"] == "verified"
        assert body["payment_status"] == "paid"
        assert body["booking_status"] == "confirmed"
    finally:
        app.dependency_overrides = {}


def test_verify_rejected_for_non_owner(client, mock_supabase):
    app = client.app
    _customer(app)  # customer cannot verify
    try:
        mock_supabase.get("/rest/v1/bookings").mock(
            return_value=Response(200, json=[_booking(payment_verification_status="waiting_verification")])
        )
        resp = client.post("/api/v1/payments/b1/verify", json={})
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert resp.json()["error"]["details"]["code"] == "FORBIDDEN_NOT_OWNER"
    finally:
        app.dependency_overrides = {}


def test_verify_rejected_for_wrong_owner(client, mock_supabase):
    app = client.app
    _owner(app, "owner_other")  # owns a different salon
    try:
        mock_supabase.get("/rest/v1/bookings").mock(
            return_value=Response(200, json=[_booking(payment_verification_status="waiting_verification")])
        )
        resp = client.post("/api/v1/payments/b1/verify", json={})
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert resp.json()["error"]["details"]["code"] == "FORBIDDEN_NOT_SALON_OWNER"
    finally:
        app.dependency_overrides = {}


def test_verify_idempotent_when_already_verified(client, mock_supabase):
    app = client.app
    _owner(app, "owner1")
    try:
        mock_supabase.get("/rest/v1/bookings").mock(
            return_value=Response(200, json=[_booking(payment_verification_status="verified", status="confirmed")])
        )
        resp = client.post("/api/v1/payments/b1/verify", json={})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["idempotent"] is True
    finally:
        app.dependency_overrides = {}


# ── owner reject ─────────────────────────────────────────────────────────────

def test_owner_reject_keeps_booking_pending(client, mock_supabase):
    app = client.app
    _owner(app, "owner1")
    try:
        mock_supabase.get("/rest/v1/bookings").mock(
            return_value=Response(200, json=[_booking(payment_verification_status="waiting_verification")])
        )
        mock_supabase.patch("/rest/v1/bookings").mock(return_value=Response(204))
        resp = client.post("/api/v1/payments/b1/reject", json={"notes": "not found"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["payment_verification_status"] == "rejected"
        assert resp.json()["booking_status"] == "pending"
    finally:
        app.dependency_overrides = {}


# ── status (caller-scoped) ───────────────────────────────────────────────────

def test_status_visible_to_customer(client, mock_supabase):
    app = client.app
    _customer(app, "cust1")
    try:
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[_booking()]))
        resp = client.get("/api/v1/payments/b1/status")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()["payment_method"] == "upi"
    finally:
        app.dependency_overrides = {}


def test_status_forbidden_for_stranger(client, mock_supabase):
    app = client.app
    _customer(app, "stranger")
    try:
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[_booking()]))
        resp = client.get("/api/v1/payments/b1/status")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_status_404_when_missing(client, mock_supabase):
    app = client.app
    _customer(app)
    try:
        mock_supabase.get("/rest/v1/bookings").mock(return_value=Response(200, json=[]))
        resp = client.get("/api/v1/payments/b1/status")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}
