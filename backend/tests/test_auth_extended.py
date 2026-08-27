"""Extended /api/v1/auth/* coverage: login, profile, push-token, prefs, delete.

These complement test_auth.py (me + forgot-password). Profile/push/prefs/delete
write via service_role (no user token) and bust the in-process user_profile_cache.
Login proxies Supabase /auth/v1/token (login_with_password).
"""

import pytest
from fastapi import status
from httpx import Response
from unittest.mock import AsyncMock, patch


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


def test_account_deletion_context_reports_provider_confirmations(client):
    from services.account_deletion import AuthProviderContext

    app = client.app
    _override_user(app, {"id": "linked-user", "email": "linked@example.com"})
    try:
        with patch(
            "routers.auth.auth_provider_context_for_user",
            new=AsyncMock(
                return_value=AuthProviderContext(frozenset({"apple", "google"}), "apple-sub")
            ),
        ):
            response = client.get("/api/v1/auth/account/deletion-context")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "requires_apple_confirmation": True,
            "has_google_identity": True,
        }
    finally:
        app.dependency_overrides = {}


def test_delete_account_removes_cleanup_profile_and_auth(client):
    from services.account_deletion import AuthProviderContext

    app = client.app
    _override_user(app, {
        "id": "delete-user",
        "email": "delete@example.com",
        "access_token": "tok",
        "profile": {"id": "delete-user", "role": "customer"},
    })
    try:
        request = AsyncMock(side_effect=[Response(204), Response(204)])
        with (
            patch(
                "routers.auth.auth_provider_context_for_user",
                new=AsyncMock(return_value=AuthProviderContext(frozenset({"email"}))),
            ),
            patch("routers.auth.delete_account_media", new=AsyncMock()) as media,
            patch("routers.auth.delete_email_leads", new=AsyncMock()) as leads,
            patch("routers.auth.supabase.request", new=request),
        ):
            response = client.request("DELETE", "/api/v1/auth/account", json={})

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Account and associated data deleted"
        media.assert_awaited_once_with("delete-user")
        leads.assert_awaited_once_with("delete@example.com")
        assert request.await_args_list[0].args[:2] == (
            "DELETE", "rest/v1/users?id=eq.delete-user"
        )
        assert request.await_args_list[1].args[:2] == (
            "DELETE", "auth/v1/admin/users/delete-user"
        )
    finally:
        app.dependency_overrides = {}


def test_delete_apple_account_requires_fresh_apple_confirmation(client):
    from services.account_deletion import AuthProviderContext

    app = client.app
    _override_user(app, {"id": "apple-user", "email": "relay@apple.test", "access_token": "tok"})
    try:
        with patch(
            "routers.auth.auth_provider_context_for_user",
            new=AsyncMock(
                return_value=AuthProviderContext(
                    frozenset({"apple"}),
                    "apple-subject",
                )
            ),
        ):
            response = client.request("DELETE", "/api/v1/auth/account", json={})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["details"]["code"] == "APPLE_REAUTH_REQUIRED"
    finally:
        app.dependency_overrides = {}


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
        mock_supabase.post("/rest/v1/users").return_value = Response(
            201, json=[{"id": "u1", "role": "customer", "name": "Test User"}]
        )
        # Welcome campaign lookup after customer profile create (best-effort).
        mock_supabase.get("/rest/v1/platform_campaigns").return_value = Response(200, json=[])

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


def test_social_customer_profile_does_not_require_name_phone_or_gender(client, mock_supabase):
    app = client.app
    _override_user(app, {
        "id": "apple-user",
        "email": "relay@privaterelay.appleid.com",
        "user_metadata": {"full_name": "Apple Person"},
        "access_token": "tok",
    })
    try:
        mock_supabase.get("/rest/v1/users").return_value = Response(200, json=[])
        mock_supabase.post("/rest/v1/users").return_value = Response(
            201,
            json=[{
                "id": "apple-user",
                "role": "customer",
                "name": "Apple Person",
                "email": "relay@privaterelay.appleid.com",
                "phone": None,
            }],
        )

        response = client.post(
            "/api/v1/auth/complete-profile",
            json={"role": "customer"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["profile"]["name"] == "Apple Person"
        assert response.json()["profile"]["phone"] is None
    finally:
        app.dependency_overrides = {}


def test_owner_profile_defers_upi_and_phone_to_salon_setup(client, mock_supabase):
    app = client.app
    _override_user(app, {
        "id": "owner-user",
        "email": "owner@example.com",
        "user_metadata": {"name": "Owner Person"},
        "access_token": "tok",
    })
    try:
        mock_supabase.get("/rest/v1/users").return_value = Response(200, json=[])
        mock_supabase.post("/rest/v1/users").return_value = Response(
            201,
            json=[{"id": "owner-user", "role": "owner", "name": "Owner Person"}],
        )
        response = client.post(
            "/api/v1/auth/complete-profile",
            json={"role": "owner"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["profile"]["role"] == "owner"
    finally:
        app.dependency_overrides = {}


def test_existing_customer_can_explicitly_activate_owner_workspace(client):
    app = client.app
    _override_user(app, {
        "id": "customer-owner",
        "email": "owner@example.com",
        "access_token": "tok",
    })
    existing = {"id": "customer-owner", "role": "customer", "name": "Owner Person"}
    activated = {**existing, "role": "owner"}
    try:
        with (
            patch(
                "routers.auth.fetch_profile_service_role",
                new=AsyncMock(side_effect=[existing, activated]),
            ),
            patch("routers.auth.supabase.request", new=AsyncMock(return_value=Response(204))) as request,
        ):
            response = client.post(
                "/api/v1/auth/complete-profile",
                json={"role": "owner"},
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["profile"]["role"] == "owner"
        assert response.json()["message"] == "Workspace activated successfully"
        assert request.await_args.kwargs["json"] == {"role": "owner"}
    finally:
        app.dependency_overrides = {}


def test_employee_claim_still_requires_invited_phone(client):
    app = client.app
    _override_user(app, {"id": "employee-user", "email": "employee@example.com", "access_token": "tok"})
    try:
        response = client.post(
            "/api/v1/auth/complete-profile",
            json={"role": "employee"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "PHONE_REQUIRED" in str(response.json())
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
