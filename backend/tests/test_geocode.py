"""Tests for /api/v1/geocode/ — Google Maps geocode proxy.

The handler calls maps.googleapis.com via its own httpx.AsyncClient, so we mock
that host with a dedicated respx router (NOT the mock_supabase fixture, which is
scoped to SUPABASE_URL). GOOGLE_MAPS_API_KEY is forced via monkeypatch so the
not-configured branch is exercised deterministically regardless of test env.
"""

import respx
from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def test_geocode_requires_auth(client):
    response = client.get("/api/v1/geocode/?address=MG+Road")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_geocode_503_when_not_configured(client, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "GOOGLE_MAPS_API_KEY", "")
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        response = client.get("/api/v1/geocode/?address=MG+Road")
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    finally:
        app.dependency_overrides = {}


def test_geocode_404_zero_results(client, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "GOOGLE_MAPS_API_KEY", "test-key")
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        with respx.mock(base_url="https://maps.googleapis.com") as mock:
            mock.get("/maps/api/geocode/json").return_value = Response(
                200, json={"status": "ZERO_RESULTS", "results": []}
            )
            response = client.get("/api/v1/geocode/?address=Nowhere")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_geocode_success(client, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "GOOGLE_MAPS_API_KEY", "test-key")
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok"})
    try:
        with respx.mock(base_url="https://maps.googleapis.com") as mock:
            mock.get("/maps/api/geocode/json").return_value = Response(
                200,
                json={
                    "status": "OK",
                    "results": [
                        {
                            "geometry": {"location": {"lat": 12.97, "lng": 77.59}},
                            "formatted_address": "MG Road, Bengaluru",
                        }
                    ],
                },
            )
            response = client.get("/api/v1/geocode/?address=MG+Road")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["coordinates"] == {"latitude": 12.97, "longitude": 77.59}
        assert data["formattedAddress"] == "MG Road, Bengaluru"
    finally:
        app.dependency_overrides = {}
