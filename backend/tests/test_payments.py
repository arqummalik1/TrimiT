"""Tests for /api/v1/payments/* stub endpoints.

Task 12 rebuilt POST /payments/create-order on PayU — its full coverage lives in
``test_payments_create_order.py``. Task 13 rebuilt POST /payments/verify — its
full coverage lives in ``test_payments_verify.py``. The webhook / status
endpoints are still the pre-PayU stubs (Tasks 14–15 replace them); this file
pins their CURRENT contract so the suite stays green and any future change to
them is deliberate. Task 20 migrates the rest to full PayU coverage.
"""

from fastapi import status

from dependencies.auth import get_current_user


# ---------------------------------------------------------------------------
# verify — now a PayU callback handler (Task 13). It is NOT user-authenticated
# (the response hash is the auth); while the flag is OFF it returns a clean
# structured ONLINE_PAYMENT_DISABLED. Full coverage: test_payments_verify.py.
# ---------------------------------------------------------------------------


def test_verify_flag_off_disabled(client, monkeypatch):
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: False)
    response = client.post(
        "/api/v1/payments/verify",
        json={"txnid": "t1", "status": "success", "hash": "x"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["details"]["code"] == "ONLINE_PAYMENT_DISABLED"


# ---------------------------------------------------------------------------
# webhook — now a PayU server-to-server handler (Task 14). It is NOT
# user-authenticated (the webhook hash is the auth); while the flag is OFF it
# acknowledges with {"status":"ignored"} and does nothing (avoids PayU retry
# storms while the feature is dark). Full coverage: test_payments_webhook.py.
# ---------------------------------------------------------------------------


def test_webhook_flag_off_ignored(client, monkeypatch):
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: False)
    response = client.post(
        "/api/v1/payments/webhook",
        json={"event": "payment.captured"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ignored"}


# ---------------------------------------------------------------------------
# status (stub)
# ---------------------------------------------------------------------------


def test_payment_status_requires_auth(client):
    response = client.get("/api/v1/payments/status?order_id=ord_1")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_payment_status_stub_returns_unknown(client):
    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "cust1",
        "access_token": "tok",
    }
    try:
        response = client.get("/api/v1/payments/status?order_id=ord_1")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "unknown"}
    finally:
        app.dependency_overrides = {}
