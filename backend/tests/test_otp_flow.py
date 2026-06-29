"""Unit tests for the email-OTP auth endpoints.

These were previously integration tests that hit a live server on localhost:8001
(and asserted outdated response messages), so they always failed in CI. They are
now proper unit tests: the FastAPI app is exercised via TestClient and Supabase's
auth endpoints are mocked with respx (the shared `client` + `mock_supabase`
fixtures from conftest.py).
"""

from fastapi import status
from httpx import Response


# ── send-otp ─────────────────────────────────────────────────────────────────

def test_send_otp_success(client, mock_supabase):
    # Supabase accepts the OTP request → endpoint returns 200 with a neutral msg.
    mock_supabase.post("/auth/v1/otp").mock(return_value=Response(200, json={}))
    resp = client.post("/api/v1/auth/send-otp", json={"email": "newuser@example.com"})
    assert resp.status_code == status.HTTP_200_OK
    assert "OTP code has been sent" in resp.json()["message"]


def test_send_otp_ineligible_email_still_ok(client, mock_supabase):
    # Anti-enumeration: an ineligible-address 4xx (not a send failure) still
    # returns 200 so we never reveal whether the email exists.
    mock_supabase.post("/auth/v1/otp").mock(
        return_value=Response(400, json={"msg": "user not found"})
    )
    resp = client.post("/api/v1/auth/send-otp", json={"email": "ghost@example.com"})
    assert resp.status_code == status.HTTP_200_OK


# ── verify-otp ─────────────────────────────────────────────────────────────────

def test_verify_otp_invalid_code(client, mock_supabase):
    # Both the primary and the alt-type verify attempts fail → structured 400.
    mock_supabase.post("/auth/v1/verify").mock(
        return_value=Response(400, json={"error_description": "Invalid token"})
    )
    resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "test@example.com", "token": "000000", "type": "magiclink"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    body = resp.json()
    assert body["error"]["details"]["code"] == "INVALID_OTP"
    assert "incorrect" in body["error"]["message"].lower() or "invalid" in body["error"]["message"].lower()


# ── forgot-password ────────────────────────────────────────────────────────────

def test_forgot_password_always_ok(client, mock_supabase):
    # Always returns 200 to prevent email enumeration, even on a Supabase error.
    mock_supabase.post("/auth/v1/recover").mock(return_value=Response(200, json={}))
    resp = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "test@example.com", "redirect_to": "trimit://reset-password"},
    )
    assert resp.status_code == status.HTTP_200_OK
    assert "message" in resp.json()
