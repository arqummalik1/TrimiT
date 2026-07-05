"""Tests for /api/v1/owner/categories/*"""

from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def test_list_categories_requires_owner(client):
    app = client.app
    _override_user(app, {"id": "u1", "access_token": "tok", "profile": {"role": "customer"}})
    try:
        r = client.get("/api/v1/owner/categories")
        assert r.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_list_categories_success(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}})
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[{"id": "s1"}])
        mock_supabase.get("/rest/v1/service_categories").return_value = Response(
            200, json=[{"id": "c1", "salon_id": "s1", "name": "Hair", "sort_order": 0, "active": True}]
        )
        mock_supabase.get("/rest/v1/services").return_value = Response(200, json=[])
        r = client.get("/api/v1/owner/categories")
        assert r.status_code == status.HTTP_200_OK
        assert r.json()[0]["name"] == "Hair"
        assert r.json()[0]["service_count"] == 0
    finally:
        app.dependency_overrides = {}


def test_delete_category_blocked_when_services_exist(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}})
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[{"id": "s1"}])
        mock_supabase.get("/rest/v1/service_categories").return_value = Response(
            200, json=[{"salon_id": "s1"}]
        )
        mock_supabase.get("/rest/v1/services").return_value = Response(
            200, json=[{"id": "svc1"}]
        )
        r = client.delete("/api/v1/owner/categories/c1")
        assert r.status_code == status.HTTP_409_CONFLICT
        assert r.json()["error"]["code"] == "CATEGORY_HAS_SERVICES"
    finally:
        app.dependency_overrides = {}
