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
import pytest


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


def test_resend_confirmation_never_auto_confirms(client, mock_supabase):
    """
    P0-1 Security Fix: Resend-confirmation must NOT auto-confirm the account.
    The old code called admin_confirm_user() on any pending account, allowing
    anyone who knew a pending email to activate it without email proof.
    
    This test ensures resend ONLY triggers the email, never confirms the user.
    """
    # Mock the profile lookup (returns email NOT confirmed)
    mock_supabase.get("/rest/v1/users").return_value = Response(
        200,
        json=[
            {
                "id": "user_pending_123",
                "email": "pending@example.com",
                "role": "customer",
                "name": "Pending User",
                "phone": None,
            }
        ],
    )
    
    # Mock the Supabase admin lookup: user exists but email NOT confirmed
    mock_supabase.get("/auth/v1/admin/users/user_pending_123").return_value = Response(
        200,
        json={
            "id": "user_pending_123",
            "email": "pending@example.com",
            "email_confirmed_at": None,  # NOT confirmed
            "created_at": "2024-01-01T00:00:00Z",
        },
    )
    
    # Mock the resend call (Supabase will send email)
    mock_supabase.post("/auth/v1/resend").return_value = Response(200, json={})
    
    # Attacker calls resend-confirmation
    response = client.post(
        "/api/v1/auth/resend-confirmation",
        json={"email": "pending@example.com"},
    )
    
    # Should return 200 (email sent)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # CRITICAL: Must NOT return "SIGNUP_READY_SIGN_IN" code (that was the bypass)
    assert data.get("code") != "SIGNUP_READY_SIGN_IN"
    
    # Should return the normal "resend confirmation" message
    assert "sent" in data["message"].lower() or "confirmation" in data["message"].lower()
    
    # Verify NO admin confirm call was made
    admin_confirm_calls = [
        (method, path) for method, path, kwargs in mock_supabase.called
        if method == "PUT" and "/auth/v1/admin/users/" in path
    ]
    assert len(admin_confirm_calls) == 0, "resend must NEVER call admin confirm"


def test_resend_confirmation_rate_limit_never_auto_confirms(client, mock_supabase):
    """P0-1: Email rate limit on resend must not admin-confirm the pending account."""
    mock_supabase.get("/rest/v1/users").return_value = Response(
        200,
        json=[
            {
                "id": "user_pending_456",
                "email": "pending2@example.com",
                "role": "customer",
                "name": "Pending",
                "phone": None,
            }
        ],
    )
    mock_supabase.get("/auth/v1/admin/users/user_pending_456").return_value = Response(
        200,
        json={
            "id": "user_pending_456",
            "email": "pending2@example.com",
            "email_confirmed_at": None,
        },
    )
    mock_supabase.post("/auth/v1/resend").return_value = Response(
        429,
        json={"error_code": "over_email_send_rate_limit", "msg": "email rate limit exceeded"},
    )

    response = client.post(
        "/api/v1/auth/resend-confirmation",
        json={"email": "pending2@example.com"},
    )

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    data = response.json()
    assert data["error"]["details"].get("code") == "AUTH_PROVIDER_EMAIL_QUOTA"
    assert data["error"]["details"].get("code") != "SIGNUP_READY_SIGN_IN"

    admin_confirm_calls = [
        (method, path)
        for method, path, _kwargs in mock_supabase.called
        if method == "PUT" and "/auth/v1/admin/users/" in path
    ]
    assert len(admin_confirm_calls) == 0


@pytest.mark.asyncio
async def test_jwt_metadata_cannot_escalate_role(mock_supabase):
    """
    P0-2: DB role is authoritative — JWT user_metadata role=owner must not upgrade customer.
    """
    from services.user_profile import resolve_profile_for_user

    mock_supabase.get("/rest/v1/users").return_value = Response(
        200,
        json=[
            {
                "id": "cust-1",
                "email": "cust@example.com",
                "role": "customer",
                "name": "Customer",
            }
        ],
    )

    profile = await resolve_profile_for_user(
        "cust-1",
        "cust@example.com",
        user_metadata={"role": "owner", "name": "Hacker"},
        user_jwt="fake-jwt-token",
    )

    assert profile is not None
    assert profile["role"] == "customer"
    assert profile["role"] != "owner"

    # JWT fallback path must not be used when service-role row exists
    jwt_reads = [
        (m, p)
        for m, p, kwargs in mock_supabase.called
        if m == "GET" and "rest/v1/users" in p and kwargs.get("token")
    ]
    assert len(jwt_reads) == 0


def test_reset_password_accepts_password_and_new_password_alias(client, mock_supabase):
    mock_supabase.put("/auth/v1/user").return_value = Response(200, json={"id": "u1"})

    canon = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "recovery-jwt", "password": "secret12"},
    )
    assert canon.status_code == status.HTTP_200_OK

    legacy = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "recovery-jwt", "new_password": "secret34"},
    )
    assert legacy.status_code == status.HTTP_200_OK

    missing = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "recovery-jwt"},
    )
    assert missing.status_code == 422
