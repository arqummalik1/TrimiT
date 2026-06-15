"""Tests for /api/v1/reviews/* — review creation guard rails."""

from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def _payload():
    return {
        "booking_id": "11111111-1111-1111-1111-111111111111",
        "salon_id": "22222222-2222-2222-2222-222222222222",
        "rating": 5,
        "comment": "Great service",
    }


def test_create_review_requires_auth(client):
    response = client.post("/api/v1/reviews/", json=_payload())
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_review_rejects_when_no_completed_booking(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "cust1", "access_token": "tok"})
    try:
        # First GET (completed booking owned by this user) returns empty -> 400.
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=[])
        response = client.post("/api/v1/reviews/", json=_payload())
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "completed booking" in response.json()["error"]["message"]
    finally:
        app.dependency_overrides = {}


def test_create_review_rejects_duplicate(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "cust1", "access_token": "tok"})
    try:
        # Booking exists (completed) ...
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200, json=[{"id": "b1"}]
        )
        # ... but a review already exists for it.
        mock_supabase.get("/rest/v1/reviews").return_value = Response(
            200, json=[{"id": "r1"}]
        )
        response = client.post("/api/v1/reviews/", json=_payload())
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already reviewed" in response.json()["error"]["message"]
    finally:
        app.dependency_overrides = {}


def test_create_review_success(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "cust1", "access_token": "tok"})
    try:
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200, json=[{"id": "b1"}]
        )
        mock_supabase.get("/rest/v1/reviews").return_value = Response(200, json=[])
        mock_supabase.post("/rest/v1/reviews").return_value = Response(201, json={})
        response = client.post("/api/v1/reviews/", json=_payload())
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Review submitted"
    finally:
        app.dependency_overrides = {}
