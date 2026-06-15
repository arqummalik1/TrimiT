"""Tests for /api/v1/staff/* — staff CRUD + service assignment.

All write endpoints depend on require_active_subscription; using a customer-role
override keeps the subscription gate transparent so the test exercises the
ownership/validation branches directly. Ownership is verified via salon queries
filtered by owner_id (a match returns a row; a non-owner returns []).

The available-staff endpoint is public and degrades gracefully (any_available=True)
when the RPC is unavailable.
"""

from fastapi import status
from httpx import Response

SALON = "44444444-4444-4444-4444-444444444444"
STAFF = "55555555-5555-5555-5555-555555555555"
SERVICE = "66666666-6666-6666-6666-666666666666"


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def _owner(app):
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )


# ── create ──────────────────────────────────────────────────────────────────

def test_create_staff_requires_auth(client):
    response = client.post("/api/v1/staff", json={"name": "Jo", "salon_id": SALON})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_staff_rejects_non_owner_of_salon(client, mock_supabase):
    app = client.app
    _owner(app)
    try:
        # salon owned-by check returns [] -> 403.
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        response = client.post(
            "/api/v1/staff", json={"name": "Jo", "salon_id": SALON}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_create_staff_success(client, mock_supabase):
    app = client.app
    _owner(app)
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": SALON}]
        )
        mock_supabase.post("/rest/v1/staff").return_value = Response(
            201,
            json=[
                {
                    "id": STAFF,
                    "name": "Jo",
                    "salon_id": SALON,
                    "is_active": True,
                    "created_at": "2026-06-14T00:00:00Z",
                    "updated_at": "2026-06-14T00:00:00Z",
                }
            ],
        )
        response = client.post(
            "/api/v1/staff", json={"name": "Jo", "salon_id": SALON}
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["id"] == STAFF
    finally:
        app.dependency_overrides = {}


# ── get (public) ────────────────────────────────────────────────────────────

def test_get_staff_404(client, mock_supabase):
    mock_supabase.get("/rest/v1/staff").return_value = Response(200, json=[])
    response = client.get(f"/api/v1/staff/{STAFF}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_salon_staff_flattens_services(client, mock_supabase):
    mock_supabase.get("/rest/v1/staff").return_value = Response(
        200,
        json=[
            {
                "id": STAFF,
                "name": "Jo",
                "salon_id": SALON,
                "is_active": True,
                "created_at": "2026-06-14T00:00:00Z",
                "updated_at": "2026-06-14T00:00:00Z",
                "staff_services": [
                    {
                        "custom_price": 120,
                        "custom_duration": 45,
                        "services": {"id": SERVICE, "name": "Cut"},
                    }
                ],
            }
        ],
    )
    response = client.get(f"/api/v1/staff/salon/{SALON}")
    assert response.status_code == status.HTTP_200_OK
    staff = response.json()[0]
    assert "staff_services" not in staff
    assert staff["services"][0]["custom_price"] == 120


# ── update ──────────────────────────────────────────────────────────────────

def test_update_staff_404_when_missing(client, mock_supabase):
    app = client.app
    _owner(app)
    try:
        mock_supabase.get("/rest/v1/staff").return_value = Response(200, json=[])
        response = client.patch(f"/api/v1/staff/{STAFF}", json={"name": "New"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_update_staff_rejects_non_owner(client, mock_supabase):
    app = client.app
    _owner(app)
    try:
        # staff exists ...
        mock_supabase.get("/rest/v1/staff").return_value = Response(
            200, json=[{"salon_id": SALON}]
        )
        # ... but salon not owned -> 403.
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        response = client.patch(f"/api/v1/staff/{STAFF}", json={"name": "New"})
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


# ── delete (soft) ───────────────────────────────────────────────────────────

def test_delete_staff_soft_deletes(client, mock_supabase):
    app = client.app
    _owner(app)
    try:
        mock_supabase.get("/rest/v1/staff").return_value = Response(
            200, json=[{"salon_id": SALON}]
        )
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": SALON}]
        )
        mock_supabase.patch("/rest/v1/staff").return_value = Response(204)
        response = client.delete(f"/api/v1/staff/{STAFF}")
        assert response.status_code == status.HTTP_204_NO_CONTENT
    finally:
        app.dependency_overrides = {}


# ── service assignment ──────────────────────────────────────────────────────

def test_assign_service_rejects_service_from_other_salon(client, mock_supabase):
    app = client.app
    _owner(app)
    try:
        mock_supabase.get("/rest/v1/staff").return_value = Response(
            200, json=[{"salon_id": SALON}]
        )
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": SALON}]
        )
        # service lookup (scoped to salon) returns [] -> 400.
        mock_supabase.get("/rest/v1/services").return_value = Response(200, json=[])
        response = client.post(
            "/api/v1/staff/services/assign",
            json={"staff_id": STAFF, "service_id": SERVICE},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    finally:
        app.dependency_overrides = {}


# ── available staff (public, graceful degradation) ──────────────────────────

def test_available_staff_degrades_gracefully(client, mock_supabase):
    # RPC failure -> returns any_available=True with empty list (production continuity).
    mock_supabase.post("/rest/v1/rpc/get_available_staff").return_value = Response(
        500, json={}
    )
    response = client.get(
        f"/api/v1/staff/available/{SALON}/{SERVICE}?booking_date=2026-06-20&time_slot=10:00"
    )
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["any_available"] is True
    assert body["available_staff"] == []
