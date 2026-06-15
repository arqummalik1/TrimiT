"""
Tests for /api/v1/payments/* endpoints.

Signature verification is HMAC over the raw body using RAZORPAY_WEBHOOK_SECRET.
Rather than depend on a configured secret, valid-signature paths monkeypatch
`routers.payments.billing.verify_webhook_signature` (the exact symbol the router
calls). The reject path needs no patch: an empty signature returns False.
"""

import json

from fastapi import status
from httpx import Response


# ---------------------------------------------------------------------------
# create-order auth guards
# ---------------------------------------------------------------------------

def test_create_order_requires_auth(client):
    response = client.post(
        "/api/v1/payments/create-order", json={"booking_id": "b1"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_order_booking_not_found(client, mock_supabase):
    from dependencies.auth import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "cust1",
        "access_token": "tok",
    }
    try:
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=[])
        response = client.post(
            "/api/v1/payments/create-order", json={"booking_id": "b1"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_create_order_rejects_other_users_booking(client, mock_supabase):
    from dependencies.auth import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "cust1",
        "access_token": "tok",
    }
    try:
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[{"id": "b1", "user_id": "other", "amount": 500, "payment_status": "pending"}],
        )
        response = client.post(
            "/api/v1/payments/create-order", json={"booking_id": "b1"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# webhook
# ---------------------------------------------------------------------------

def test_webhook_rejects_invalid_signature(client):
    # No X-Razorpay-Signature header -> verify returns False -> 400, before any
    # Supabase interaction.
    response = client.post(
        "/api/v1/payments/webhook",
        content=json.dumps({"event": "payment.captured"}),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_webhook_dedupes_duplicate_event(client, mock_supabase, monkeypatch):
    from routers import payments

    monkeypatch.setattr(payments.billing, "verify_webhook_signature", lambda raw, sig: True)
    # webhook_logs insert returns 409 (event already seen) -> handler short-circuits.
    mock_supabase.post("/rest/v1/webhook_logs").return_value = Response(409, json={})

    response = client.post(
        "/api/v1/payments/webhook",
        content=json.dumps({"event": "payment.captured"}),
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "whatever",
            "X-Razorpay-Event-Id": "evt_dup_1",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok", "duplicate": True}


def test_webhook_payment_captured_already_paid_is_idempotent(
    client, mock_supabase, monkeypatch
):
    from routers import payments

    monkeypatch.setattr(payments.billing, "verify_webhook_signature", lambda raw, sig: True)
    # Fresh event: insert succeeds.
    mock_supabase.post("/rest/v1/webhook_logs").return_value = Response(201, json={})
    # Booking matches order; amount matches (₹100 -> 10000 paise); already paid so
    # _mark_booking_paid_from_webhook returns early (no PATCH, no push side effects).
    mock_supabase.get("/rest/v1/bookings").return_value = Response(
        200,
        json=[
            {
                "id": "b1",
                "user_id": "cust1",
                "amount": 100,
                "payment_status": "paid",
                "payment_id": "pay_existing",
            }
        ],
    )
    # Final webhook_logs status PATCH.
    mock_supabase.patch("/rest/v1/webhook_logs").return_value = Response(204)

    event = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {"id": "pay_1", "order_id": "ord_1", "amount": 10000}
            }
        },
    }
    response = client.post(
        "/api/v1/payments/webhook",
        content=json.dumps(event),
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "valid",
            "X-Razorpay-Event-Id": "evt_cap_1",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_webhook_unknown_event_acknowledged(client, mock_supabase, monkeypatch):
    from routers import payments

    monkeypatch.setattr(payments.billing, "verify_webhook_signature", lambda raw, sig: True)
    mock_supabase.post("/rest/v1/webhook_logs").return_value = Response(201, json={})
    mock_supabase.patch("/rest/v1/webhook_logs").return_value = Response(204)

    response = client.post(
        "/api/v1/payments/webhook",
        content=json.dumps({"event": "subscription.charged"}),
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "valid",
            "X-Razorpay-Event-Id": "evt_other_1",
        },
    )
    # Unknown-to-this-router events are logged and acked with 200 (retry-safe).
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------

def test_payment_status_requires_auth(client):
    response = client.get("/api/v1/payments/status?order_id=ord_1")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_payment_status_unknown_order(client, mock_supabase):
    from dependencies.auth import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "cust1",
        "access_token": "tok",
    }
    try:
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=[])
        response = client.get("/api/v1/payments/status?order_id=ord_missing")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "unknown"}
    finally:
        app.dependency_overrides = {}
