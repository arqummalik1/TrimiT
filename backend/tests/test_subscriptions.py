"""Tests for /api/v1/subscriptions/* — owner gate, status, cancel, webhook, admin.

The router is a thin layer over subscription_service (subs), subscription_billing
(billing) and notifications (notify). We monkeypatch those module-level functions
on `routers.subscriptions` so tests exercise the ROUTER's branching (owner-only
403, 404 no-sub, 400 no-active-sub, webhook signature/dedup, admin-token guard)
without real Supabase/Razorpay.
"""

import json

import pytest
from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def _owner(app, owner_id="owner1"):
    _override_user(
        app,
        {"id": owner_id, "email": "o@x.com", "access_token": "tok", "profile": {"role": "owner"}},
    )


def _customer(app):
    _override_user(
        app, {"id": "cust1", "access_token": "tok", "profile": {"role": "customer"}}
    )


async def _async_return(value):
    return value


# ── owner gate ──────────────────────────────────────────────────────────────

def test_current_requires_auth(client):
    assert client.get("/api/v1/subscriptions/current").status_code == status.HTTP_401_UNAUTHORIZED


def test_current_rejects_non_owner(client):
    app = client.app
    _customer(app)
    try:
        response = client.get("/api/v1/subscriptions/current")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["details"]["code"] == "OWNER_ONLY"
    finally:
        app.dependency_overrides = {}


def test_status_returns_access_view(client, monkeypatch):
    from routers import subscriptions as sub_router

    app = client.app
    _owner(app)
    try:
        row = {"next_renewal_at": "2026-07-01T00:00:00Z"}
        monkeypatch.setattr(sub_router.subs, "ensure_trial", lambda oid: _async_return(row))
        monkeypatch.setattr(
            sub_router.subs,
            "compute_access",
            lambda r: {
                "effective_status": "trial",
                "has_access": True,
                "is_trial": True,
                "trial_days_remaining": 10,
            },
        )
        response = client.get("/api/v1/subscriptions/status")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "trial"
        assert body["has_access"] is True
        assert body["trial_days_remaining"] == 10
    finally:
        app.dependency_overrides = {}


# ── cancel ──────────────────────────────────────────────────────────────────

def test_cancel_400_when_no_active_subscription(client, monkeypatch):
    from routers import subscriptions as sub_router

    app = client.app
    _owner(app)
    try:
        monkeypatch.setattr(sub_router.subs, "fetch_subscription", lambda oid: _async_return(None))
        response = client.post("/api/v1/subscriptions/cancel", json={"cancel_at_cycle_end": True})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["details"]["code"] == "NO_ACTIVE_SUB"
    finally:
        app.dependency_overrides = {}


def test_cancel_at_cycle_end_schedules(client, monkeypatch):
    from routers import subscriptions as sub_router

    app = client.app
    _owner(app)
    try:
        monkeypatch.setattr(
            sub_router.subs,
            "fetch_subscription",
            lambda oid: _async_return({"id": "sub1", "razorpay_subscription_id": "rzp_1"}),
        )
        monkeypatch.setattr(sub_router.billing, "cancel_subscription", lambda sid, at_cycle_end: None)
        monkeypatch.setattr(
            sub_router.subs, "update_subscription",
            lambda *a, **k: _async_return({}),
        )
        response = client.post("/api/v1/subscriptions/cancel", json={"cancel_at_cycle_end": True})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "scheduled"
    finally:
        app.dependency_overrides = {}


# ── verify ──────────────────────────────────────────────────────────────────

def test_verify_404_when_no_subscription(client, mock_supabase, monkeypatch):
    from routers import subscriptions as sub_router

    app = client.app
    _owner(app)
    try:
        # idempotency_required(required=True): claim slot succeeds, then 404 deletes it.
        mock_supabase.post("/rest/v1/idempotency_keys").return_value = Response(201, json={})
        mock_supabase.delete("/rest/v1/idempotency_keys").return_value = Response(204)
        monkeypatch.setattr(sub_router.subs, "fetch_subscription", lambda oid: _async_return(None))
        response = client.post(
            "/api/v1/subscriptions/verify",
            json={
                "razorpay_payment_id": "pay_1",
                "razorpay_subscription_id": "rzp_1",
                "razorpay_signature": "sig",
            },
            headers={"Idempotency-Key": "k-verify-404"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["error"]["details"]["code"] == "NO_SUBSCRIPTION"
    finally:
        app.dependency_overrides = {}


# ── webhook ─────────────────────────────────────────────────────────────────

def test_webhook_rejects_invalid_signature(client, monkeypatch):
    from routers import subscriptions as sub_router

    monkeypatch.setattr(sub_router.billing, "verify_webhook_signature", lambda raw, sig: False)
    response = client.post(
        "/api/v1/subscriptions/webhook",
        content=json.dumps({"event": "subscription.charged"}),
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "bad"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_webhook_dedupes_duplicate(client, mock_supabase, monkeypatch):
    from routers import subscriptions as sub_router

    monkeypatch.setattr(sub_router.billing, "verify_webhook_signature", lambda raw, sig: True)
    mock_supabase.post("/rest/v1/webhook_logs").return_value = Response(409, json={})
    response = client.post(
        "/api/v1/subscriptions/webhook",
        content=json.dumps({"event": "subscription.charged"}),
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "ok",
            "X-Razorpay-Event-Id": "evt_1",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok", "duplicate": True}


def test_webhook_unknown_subscription_acked(client, mock_supabase, monkeypatch):
    from routers import subscriptions as sub_router

    monkeypatch.setattr(sub_router.billing, "verify_webhook_signature", lambda raw, sig: True)
    mock_supabase.post("/rest/v1/webhook_logs").return_value = Response(201, json={})
    mock_supabase.patch("/rest/v1/webhook_logs").return_value = Response(204)
    # _process_webhook_event: no subscription id in payload -> returns early, acked.
    response = client.post(
        "/api/v1/subscriptions/webhook",
        content=json.dumps({"event": "subscription.charged", "payload": {}}),
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "ok",
            "X-Razorpay-Event-Id": "evt_2",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


# ── admin reminders ─────────────────────────────────────────────────────────

def test_run_reminders_401_without_token(client, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", "secret-token")
    response = client.post("/api/v1/subscriptions/internal/run-reminders")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_run_reminders_403_with_wrong_token(client, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", "secret-token")
    response = client.post(
        "/api/v1/subscriptions/internal/run-reminders",
        headers={"Authorization": "Bearer wrong"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_run_reminders_success_with_token(client, monkeypatch):
    from config import settings
    from routers import subscriptions as sub_router

    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", "secret-token")
    monkeypatch.setattr(sub_router.notify, "run_trial_reminders", lambda: _async_return(3))
    response = client.post(
        "/api/v1/subscriptions/internal/run-reminders",
        headers={"Authorization": "Bearer secret-token"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok", "sent": 3}
