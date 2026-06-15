"""Tests for /api/v1/owner/* — owner salon + analytics."""

from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def test_owner_salon_requires_auth(client):
    response = client.get("/api/v1/owner/salon")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_owner_salon_404_when_none(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "owner1", "access_token": "tok"})
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        response = client.get("/api/v1/owner/salon")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_owner_salon_returns_salon_with_services(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "owner1", "access_token": "tok"})
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "s1", "name": "Cuts", "images": ["http://img/1.jpg"]}]
        )
        mock_supabase.get("/rest/v1/services").return_value = Response(
            200, json=[{"id": "svc1", "name": "Haircut"}]
        )
        response = client.get("/api/v1/owner/salon")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == "s1"
        assert len(data["services"]) == 1
        # image_url backfilled from images[0]
        assert data["image_url"] == "http://img/1.jpg"
    finally:
        app.dependency_overrides = {}


def test_owner_analytics_404_when_no_salon(client, mock_supabase):
    # Customer role passes require_active_subscription untouched; missing salon -> 404.
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        response = client.get("/api/v1/owner/analytics?period=today")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_owner_analytics_aggregates_bookings(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "s1"}]
        )
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[
                {"status": "completed", "amount": 100, "services": {"name": "Cut", "price": 100}},
                {"status": "pending", "amount": 50, "services": {"name": "Shave", "price": 50}},
            ],
        )
        response = client.get("/api/v1/owner/analytics?period=week")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_bookings"] == 2
        assert data["total_earnings"] == 100  # only completed counted
        assert data["pending_bookings"] == 1
        assert data["completed_bookings"] == 1
    finally:
        app.dependency_overrides = {}
