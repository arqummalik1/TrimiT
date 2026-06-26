"""Tests for Task 17 — Admin-configurable commission rate.

Covers `GET/PUT /api/v1/admin/commission-rate`:
- Admin-token guard (no header → 401; wrong token → 403), matching the rest of
  the admin router (Req 15.4).
- GET returns the configured value read from `app_settings` (Req 15.1).
- PUT with a valid value upserts `app_settings.commission_percent` and echoes
  the new value (Req 15.2).
- PUT with an out-of-range value (150 / -5) → 400 INVALID_COMMISSION_RATE and
  performs no write (Req 15.3).

All Supabase REST traffic is intercepted by respx (see `mock_supabase` in
conftest) — no real network.

Validates: Requirements 15.1, 15.2, 15.3, 15.4.
"""

import pytest
from fastapi import status
from httpx import Response

from core.supabase import supabase
from routers import admin

GET_URL = "/api/v1/admin/commission-rate"
PUT_URL = "/api/v1/admin/commission-rate"

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}


@pytest.fixture
def admin_token(monkeypatch):
    """Configure a static admin token for the duration of a test."""
    monkeypatch.setattr(admin.settings, "ADMIN_API_TOKEN", ADMIN_TOKEN)
    # Reset the cached httpx client so it binds to this test's event loop.
    supabase._client = None
    yield ADMIN_TOKEN
    supabase._client = None


# ---------------------------------------------------------------------------
# 1. Auth guard — no token / wrong token rejected (Req 15.4)
# ---------------------------------------------------------------------------


def test_get_without_token_rejected(client, admin_token):
    response = client.get(GET_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["error"]["details"]["code"] == "ADMIN_AUTH_REQUIRED"


def test_put_without_token_rejected(client, admin_token):
    response = client.put(PUT_URL, json={"commission_percent": 7})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["error"]["details"]["code"] == "ADMIN_AUTH_REQUIRED"


def test_get_with_wrong_token_forbidden(client, admin_token):
    response = client.get(GET_URL, headers={"Authorization": "Bearer wrong"})
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["details"]["code"] == "ADMIN_AUTH_INVALID"


def test_put_with_wrong_token_forbidden(client, admin_token, mock_supabase):
    response = client.put(
        PUT_URL,
        json={"commission_percent": 7},
        headers={"Authorization": "Bearer wrong"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["details"]["code"] == "ADMIN_AUTH_INVALID"
    # Rejected before any write.
    assert not mock_supabase.calls


# ---------------------------------------------------------------------------
# 2. GET returns the configured value (Req 15.1)
# ---------------------------------------------------------------------------


def test_get_returns_configured_value(client, admin_token, mock_supabase):
    mock_supabase.get("/rest/v1/app_settings").mock(
        return_value=Response(200, json=[{"value": "7"}])
    )
    response = client.get(GET_URL, headers=ADMIN_HEADERS)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"commission_percent": 7.0}


# ---------------------------------------------------------------------------
# 3. PUT valid value → upsert app_settings, echo new value (Req 15.2)
# ---------------------------------------------------------------------------


def test_put_valid_value_updates_existing_row(client, admin_token, mock_supabase):
    # Existing row present → PATCH (update in place) path.
    mock_supabase.get("/rest/v1/app_settings").mock(
        return_value=Response(200, json=[{"key": "commission_percent"}])
    )
    patch_route = mock_supabase.patch("/rest/v1/app_settings").mock(
        return_value=Response(200, json=[{"key": "commission_percent", "value": "7.0"}])
    )

    response = client.put(PUT_URL, json={"commission_percent": 7}, headers=ADMIN_HEADERS)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"commission_percent": 7.0}
    assert patch_route.called
    # The persisted value is the stringified rate.
    import json as _json

    sent = _json.loads(patch_route.calls.last.request.content)
    assert sent["value"] == "7.0"


def test_put_valid_value_inserts_when_missing(client, admin_token, mock_supabase):
    # No existing row → POST (insert) path.
    mock_supabase.get("/rest/v1/app_settings").mock(
        return_value=Response(200, json=[])
    )
    post_route = mock_supabase.post("/rest/v1/app_settings").mock(
        return_value=Response(201, json=[{"key": "commission_percent", "value": "12.5"}])
    )

    response = client.put(
        PUT_URL, json={"commission_percent": 12.5}, headers=ADMIN_HEADERS
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"commission_percent": 12.5}
    assert post_route.called
    import json as _json

    sent = _json.loads(post_route.calls.last.request.content)
    assert sent["key"] == "commission_percent"
    assert sent["value"] == "12.5"


# ---------------------------------------------------------------------------
# 4. PUT out-of-range → 400 INVALID_COMMISSION_RATE, no write (Req 15.3)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("bad_value", [150, -5, 100.5, -0.1])
def test_put_out_of_range_rejected_no_write(
    client, admin_token, mock_supabase, bad_value
):
    response = client.put(
        PUT_URL, json={"commission_percent": bad_value}, headers=ADMIN_HEADERS
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"]["details"]["code"] == "INVALID_COMMISSION_RATE"
    # The stored value must be left untouched — no Supabase call at all.
    assert not mock_supabase.calls


# ---------------------------------------------------------------------------
# 5. Boundary values 0 and 100 are accepted (Req 15.3 inclusive range)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("good_value", [0, 100])
def test_put_boundary_values_accepted(client, admin_token, mock_supabase, good_value):
    mock_supabase.get("/rest/v1/app_settings").mock(
        return_value=Response(200, json=[{"key": "commission_percent"}])
    )
    mock_supabase.patch("/rest/v1/app_settings").mock(
        return_value=Response(200, json=[{"key": "commission_percent"}])
    )
    response = client.put(
        PUT_URL, json={"commission_percent": good_value}, headers=ADMIN_HEADERS
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"commission_percent": float(good_value)}
