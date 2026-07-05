"""Extended /api/v1/auth/* coverage: login, profile, push-token, prefs, delete.

These complement test_auth.py (me + forgot-password). Profile/push/prefs/delete
write via service_role (no user token) and bust the in-process user_profile_cache.
Login proxies Supabase /auth/v1/token (login_with_password).
"""

import pytest
from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


# ── login ───────────────────────────────────────────────────────────────────

def test_login_invalid_credentials_maps_to_401(client, mock_supabase):
    # Supabase token endpoint returns 400 invalid login -> handler raises 401.
    mock_supabase.post(
        "/auth/v1/token", params={"grant_type": "password"}
    ).return_value = Response(
        400, json={"error": "invalid_grant", "error_description": "Invalid login credentials"}
    )
    response = client.post(
        "/api/v1/auth/login", json={"email": "a@b.com", "password": "wrong"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["error"]["details"]["code"] == "INVALID_CREDENTIALS"


# ── profile ─────────────────────────────────────────────────────────────────

def test_profile_requires_auth(client):
    assert client.patch("/api/v1/auth/profile", json={"name": "X"}).status_code == status.HTTP_401_UNAUTHORIZED


def test_profile_no_changes_short_circuits(client):
    # Empty payload returns "No changes" without any Supabase call.
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        response = client.patch("/api/v1/auth/profile", json={})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "No changes"
    finally:
        app.dependency_overrides = {}


def test_profile_update_success(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        mock_supabase.patch("/rest/v1/users").return_value = Response(204)
        # fetch_profile_service_role re-reads the row.
        mock_supabase.get("/rest/v1/users").return_value = Response(
            200, json=[{"id": "u1", "name": "New Name"}]
        )
        response = client.patch("/api/v1/auth/profile", json={"name": "New Name"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Profile updated"
    finally:
        app.dependency_overrides = {}


# ── push token ──────────────────────────────────────────────────────────────

def test_push_token_rejects_bad_format(client):
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        response = client.post(
            "/api/v1/auth/push-token", json={"push_token": "not-a-real-token"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["details"]["code"] == "INVALID_PUSH_TOKEN"
    finally:
        app.dependency_overrides = {}


def test_push_token_accepts_valid_expo_token(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        mock_supabase.patch("/rest/v1/users").return_value = Response(204)
        response = client.post(
            "/api/v1/auth/push-token",
            json={"push_token": "ExponentPushToken[abc123]"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Push token saved"
    finally:
        app.dependency_overrides = {}


# ── notification preferences ────────────────────────────────────────────────

def test_notification_prefs_update(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        mock_supabase.patch("/rest/v1/users").return_value = Response(204)
        mock_supabase.get("/rest/v1/users").return_value = Response(
            200, json=[{"id": "u1", "notify_bookings": False}]
        )
        response = client.patch(
            "/api/v1/auth/notification-preferences", json={"notify_bookings": False}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Preferences updated"
    finally:
        app.dependency_overrides = {}


# ── delete account ──────────────────────────────────────────────────────────

def test_delete_account_requires_auth(client):
    assert client.delete("/api/v1/auth/account").status_code == status.HTTP_401_UNAUTHORIZED


# ── complete profile ────────────────────────────────────────────────────────

def test_complete_profile_requires_auth(client):
    response = client.post(
        "/api/v1/auth/complete-profile",
        json={"role": "customer", "name": "Test User"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_complete_profile_validation_error(client):
    app = client.app
    _override_user(app, {"id": "u1", "email": "test@example.com", "access_token": "tok"})
    try:
        # Invalid role 'admin'
        response = client.post(
            "/api/v1/auth/complete-profile",
            json={"role": "admin", "name": "Test User"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    finally:
        app.dependency_overrides = {}


def test_complete_profile_success(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "u1", "email": "test@example.com", "access_token": "tok"})
    try:
        # Mocking rest GET returning empty list initially (no profile exists)
        mock_supabase.get("/rest/v1/users").return_value = Response(
            200, json=[]
        )
        # Mocking rest POST to create user
        mock_supabase.post("/rest/v1/users").return_value = Response(201, json={"id": "u1", "role": "customer", "name": "Test User"})
        
        response = client.post(
            "/api/v1/auth/complete-profile",
            json={"role": "customer", "name": "Test User", "phone": "+919876543210", "gender": "male"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "profile" in data
        assert data["profile"]["role"] == "customer"
        assert data["profile"]["name"] == "Test User"
        assert "message" in data
    finally:
        app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_resolve_profile_for_user_missing_returns_none(mock_supabase):
    # Mock GET /rest/v1/users returning empty list (meaning profile missing)
    mock_supabase.get("/rest/v1/users").return_value = Response(200, json=[])
    
    from services.user_profile import resolve_profile_for_user
    result = await resolve_profile_for_user(
        user_id="missing_user",
        email="missing@example.com",
    )
    assert result is None


@pytest.mark.asyncio
async def test_resolve_profile_for_user_exists_returns_row(mock_supabase):
    # Mock GET /rest/v1/users returning the existing profile
    mock_supabase.get("/rest/v1/users").return_value = Response(
        200, json=[{"id": "existing_user", "role": "owner", "name": "Existing Owner"}]
    )
    
    from services.user_profile import resolve_profile_for_user
    result = await resolve_profile_for_user(
        user_id="existing_user",
        email="existing@example.com",
    )
    assert result is not None
    assert result["role"] == "owner"
    assert result["name"] == "Existing Owner"


