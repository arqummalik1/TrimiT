"""
Tests for /api/v1/auth/* endpoints.

Pattern (mirrors test_priority.py / test_early_access.py):
- `mock_supabase` (respx) intercepts every httpx call to settings.SUPABASE_URL.
- `app.dependency_overrides[get_current_user]` bypasses real JWT decoding where a
  test needs an authenticated principal.
- Overrides are always cleared in a finally block so tests stay isolated.
- Error responses use the envelope from core/exceptions.py:
  {"success": False, "error": {"code", "message", "details"}, "request_id"}.
"""

from fastapi import status
from httpx import Response


def test_me_requires_auth(client):
    # No Authorization header -> get_current_user raises 401 before the handler.
    response = client.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_returns_flattened_profile(client):
    from dependencies.auth import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "u123",
        "email": "owner@example.com",
        "profile": {
            "name": "Owner One",
            "phone": "+919876543210",
            "role": "owner",
            "push_enabled": True,
        },
    }
    try:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # get_me flattens common profile fields to the top level for older clients.
        assert data["id"] == "u123"
        assert data["email"] == "owner@example.com"
        assert data["name"] == "Owner One"
        assert data["role"] == "owner"
        assert data["push_enabled"] is True
        assert data["profile"]["phone"] == "+919876543210"
    finally:
        app.dependency_overrides = {}


def test_me_tolerates_missing_profile(client):
    # current_user may have no resolved public.users profile yet.
    from dependencies.auth import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "u999",
        "email": "new@example.com",
    }
    try:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == "u999"
        # Absent profile fields flatten to null, not a KeyError.
        assert data["name"] is None
        assert data["role"] is None
        assert data["profile"] == {}
    finally:
        app.dependency_overrides = {}


def test_forgot_password_always_returns_success(client, mock_supabase):
    # Supabase recover returns 200; handler echoes the generic message.
    mock_supabase.post("/auth/v1/recover").return_value = Response(200, json={})

    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "someone@example.com", "redirect_to": "trimit://reset-password"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "An OTP code has been sent if the email is valid"


def test_forgot_password_hides_unknown_email(client, mock_supabase):
    # Even when Supabase reports the email is unknown (400), we must NOT leak that
    # (anti-enumeration) — the response stays a 200 with the same generic message.
    mock_supabase.post("/auth/v1/recover").return_value = Response(
        400, json={"error": "user not found"}
    )

    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "ghost@example.com", "redirect_to": "trimit://reset-password"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "An OTP code has been sent if the email is valid"


def test_forgot_password_rate_limited_surfaces_429(client, mock_supabase):
    # When Supabase rate-limits (429), the handler surfaces a 429 with a code so the
    # client can show the "paused for an hour" guidance.
    mock_supabase.post("/auth/v1/recover").return_value = Response(429, json={})

    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "spammer@example.com", "redirect_to": "trimit://reset-password"},
    )
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert response.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
