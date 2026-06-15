"""Tests for /api/v1/salons/* — public discovery + owner CRUD.

Notes verified from source:
- GET / and GET /{id} are PUBLIC (no auth).
- create_salon requires profile.role == 'owner'.
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
    }


def test_create_salon_requires_auth(client):
    response = client.post("/api/v1/salons/", json=_salon_payload())
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_salon_rejects_non_owner(client):
    app = client.app
    _override_user(
        app, {"id": "u1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        response = client.post("/api/v1/salons/", json=_salon_payload())
        assert response.status_code == status.HTTP_403_FORBIDDEN
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
