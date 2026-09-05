"""Tests for /api/v1/salons/* — public discovery + owner CRUD.

Notes verified from source:
- GET / and GET /{id} are PUBLIC (no auth).
- create_salon preserves the legacy owner path and uses one atomic RPC when the
  authenticated profile is still a customer.
- update/create/delete service go through assert_salon_owner, which queries
  salons with service_role=True (no user token) and 404s/403s on mismatch.
"""

from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


# ── public discovery ────────────────────────────────────────────────────────

def test_get_salons_returns_paginated_envelope(client, mock_supabase):
    mock_supabase.post("/rest/v1/rpc/get_nearby_salons_v1").return_value = Response(
        200, json=[{"id": "s1", "name": "Cuts", "distance": 1.234}]
    )
    response = client.get("/api/v1/salons/?lat=12.9&lng=77.5")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "data" in body and "pagination" in body
    assert body["data"][0]["distance"] == 1.2  # rounded to 1 dp


def test_get_salons_falls_back_when_rpc_fails(client, mock_supabase):
    # RPC errors -> handler uses _fallback_nearby_salons which GETs rest/v1/salons.
    mock_supabase.post("/rest/v1/rpc/get_nearby_salons_v1").return_value = Response(
        500, json={}
    )
    mock_supabase.get("/rest/v1/salons").return_value = Response(
        200,
        json=[{"id": "s1", "name": "A", "latitude": 12.9, "longitude": 77.5}],
    )
    response = client.get("/api/v1/salons/?lat=0&lng=0")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["data"][0]["id"] == "s1"


def test_get_salon_invalid_uuid_404(client):
    response = client.get("/api/v1/salons/not-a-uuid")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_salon_not_found(client, mock_supabase):
    mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
    response = client.get("/api/v1/salons/33333333-3333-3333-3333-333333333333")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_salon_computes_avg_rating(client, mock_supabase):
    mock_supabase.get("/rest/v1/salons").return_value = Response(
        200,
        json=[
            {
                "id": "s1",
                "name": "Cuts",
                "services": [],
                "reviews": [{"rating": 4}, {"rating": 5}],
            }
        ],
    )
    mock_supabase.get("/rest/v1/service_categories").return_value = Response(200, json=[])
    response = client.get("/api/v1/salons/33333333-3333-3333-3333-333333333333")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["avg_rating"] == 4.5
    assert data["review_count"] == 2


# ── create salon ────────────────────────────────────────────────────────────

def _salon_payload():
    return {
        "name": "New Salon",
        "address": "1 MG Road",
        "city": "Bengaluru",
        "phone": "+919876543210",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }


def test_create_salon_requires_auth(client):
    response = client.post("/api/v1/salons/", json=_salon_payload())
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_salon_rejects_employee(client):
    app = client.app
    _override_user(
        app, {"id": "u1", "access_token": "tok", "profile": {"role": "employee"}}
    )
    try:
        response = client.post("/api/v1/salons/", json=_salon_payload())
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_customer_create_salon_uses_atomic_activation_rpc(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "customer1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.post(
            "/rest/v1/rpc/activate_owner_and_create_salon_v1"
        ).return_value = Response(
            200,
            json=[{"id": "s-new", "owner_id": "customer1", "name": "New Salon"}],
        )

        response = client.post("/api/v1/salons/", json=_salon_payload())

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == "s-new"
        rpc_calls = [
            call for call in mock_supabase.called
            if call[0] == "POST" and call[1] == "rest/v1/rpc/activate_owner_and_create_salon_v1"
        ]
        assert len(rpc_calls) == 1
        rpc_kwargs = rpc_calls[0][2]
        assert rpc_kwargs["service_role"] is True
        assert rpc_kwargs["json"]["p_user_id"] == "customer1"
        assert rpc_kwargs["json"]["p_salon"]["name"] == "New Salon"
        assert not any(call[0] == "PATCH" and "rest/v1/users" in call[1] for call in mock_supabase.called)
        assert not any(call[0] == "POST" and call[1] == "rest/v1/salons" for call in mock_supabase.called)
    finally:
        app.dependency_overrides = {}


def test_customer_create_failure_does_not_fall_back_to_non_atomic_writes(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "customer1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.post(
            "/rest/v1/rpc/activate_owner_and_create_salon_v1"
        ).return_value = Response(
            400,
            json={"code": "P0001", "message": "validation failed"},
        )

        response = client.post("/api/v1/salons/", json=_salon_payload())

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["details"]["code"] == "SALON_CREATE_FAILED"
        assert not any(call[0] == "PATCH" and "rest/v1/users" in call[1] for call in mock_supabase.called)
        assert not any(call[0] == "POST" and call[1] == "rest/v1/salons" for call in mock_supabase.called)
    finally:
        app.dependency_overrides = {}


def test_customer_create_reports_missing_atomic_migration(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "customer1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.post(
            "/rest/v1/rpc/activate_owner_and_create_salon_v1"
        ).return_value = Response(
            404,
            json={"code": "PGRST202", "message": "function not found"},
        )

        response = client.post("/api/v1/salons/", json=_salon_payload())

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()["error"]["details"]["code"] == "OWNER_ACTIVATION_NOT_READY"
    finally:
        app.dependency_overrides = {}


def test_empty_owner_workspace_recovery_uses_service_role_rpc(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}}
    )
    try:
        mock_supabase.post(
            "/rest/v1/rpc/cancel_empty_owner_workspace_v1"
        ).return_value = Response(
            200,
            json=[{
                "id": "owner1",
                "email": "owner@example.com",
                "name": "Owner",
                "role": "customer",
                "created_at": "2026-01-01T00:00:00Z",
            }],
        )

        response = client.delete("/api/v1/auth/owner-workspace")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["profile"]["role"] == "customer"
        rpc_call = mock_supabase.called[0]
        assert rpc_call == (
            "POST",
            "rest/v1/rpc/cancel_empty_owner_workspace_v1",
            {"json": {"p_user_id": "owner1"}, "service_role": True},
        )
    finally:
        app.dependency_overrides = {}


def test_create_salon_rejects_when_already_has_one(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}}
    )
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "existing"}]
        )
        response = client.post("/api/v1/salons/", json=_salon_payload())
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already have a salon" in response.json()["error"]["message"]
    finally:
        app.dependency_overrides = {}


def test_create_salon_success(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}}
    )
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        mock_supabase.post("/rest/v1/salons").return_value = Response(
            201, json=[{"id": "s-new", "name": "New Salon"}]
        )
        response = client.post("/api/v1/salons/", json=_salon_payload())
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == "s-new"
    finally:
        app.dependency_overrides = {}


# ── service CRUD (ownership via assert_salon_owner, service_role) ────────────

def test_delete_service_rejects_non_owner(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        # assert_salon_owner: salon exists but owned by someone else -> 403.
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"owner_id": "another"}]
        )
        response = client.delete("/api/v1/salons/s1/services/svc1")
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_delete_service_404_when_service_missing(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        # Owner check passes (owner_id matches) ...
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"owner_id": "owner1"}]
        )
        # ... but service lookup returns empty -> 404.
        mock_supabase.get("/rest/v1/services").return_value = Response(200, json=[])
        response = client.delete("/api/v1/salons/s1/services/svc-missing")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}
