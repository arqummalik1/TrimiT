"""
Tests for /api/v1/bookings/* endpoints.

Focus: the authorization branches in `update_booking_status` and `list_my_bookings`,
which are the parts that gate real-money / multi-tenant access.

`update_booking_status` depends on `require_active_subscription`, which itself depends
on `get_current_user`. Overriding `get_current_user` is enough: for a customer
(role != "owner") the subscription dependency returns the user untouched, so no
subscription mock is needed.
"""

from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def test_status_update_booking_not_found(client, mock_supabase):
    app = client.app
    _override_user(
        app,
        {
            "id": "cust1",
            "access_token": "tok",
            "profile": {"role": "customer"},
        },
    )
    try:
        # Booking lookup returns empty -> 404.
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=[])
        response = client.patch(
            "/api/v1/bookings/b-missing/status", json={"status": "cancelled"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_customer_cannot_update_other_users_booking(client, mock_supabase):
    app = client.app
    _override_user(
        app,
        {
            "id": "cust1",
            "access_token": "tok",
            "profile": {"role": "customer"},
        },
    )
    try:
        # Booking belongs to a different user -> 403.
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[
                {
                    "id": "b1",
                    "user_id": "someone_else",
                    "salon_id": "s1",
                    "status": "pending",
                }
            ],
        )
        response = client.patch(
            "/api/v1/bookings/b1/status", json={"status": "cancelled"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_customer_may_only_cancel_not_confirm(client, mock_supabase):
    app = client.app
    _override_user(
        app,
        {
            "id": "cust1",
            "access_token": "tok",
            "profile": {"role": "customer"},
        },
    )
    try:
        # Own booking, but customer tries to confirm -> 403 ("may only cancel").
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[
                {
                    "id": "b1",
                    "user_id": "cust1",
                    "salon_id": "s1",
                    "status": "pending",
                }
            ],
        )
        response = client.patch(
            "/api/v1/bookings/b1/status", json={"status": "confirmed"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "only cancel" in response.json()["error"]["message"]
    finally:
        app.dependency_overrides = {}


def test_status_update_invalid_status_value(client):
    # Body validation happens before any Supabase call -> 422, no mock needed.
    app = client.app
    _override_user(
        app,
        {
            "id": "cust1",
            "access_token": "tok",
            "profile": {"role": "customer"},
        },
    )
    try:
        response = client.patch(
            "/api/v1/bookings/b1/status", json={"status": "not_a_real_status"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    finally:
        app.dependency_overrides = {}


def test_list_my_bookings_requires_auth(client):
    response = client.get("/api/v1/bookings/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_my_bookings_customer_returns_rows(client, mock_supabase):
    app = client.app
    _override_user(
        app,
        {
            "id": "cust1",
            "access_token": "tok",
            "profile": {"role": "customer"},
        },
    )
    try:
        rows = [{"id": "b1", "user_id": "cust1", "status": "pending"}]
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=rows)
        response = client.get("/api/v1/bookings/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == rows
    finally:
        app.dependency_overrides = {}


def test_list_my_bookings_owner_without_salon_returns_empty(client, mock_supabase):
    app = client.app
    _override_user(
        app,
        {
            "id": "owner1",
            "access_token": "tok",
            "profile": {"role": "owner"},
        },
    )
    try:
        # Owner has no salon row -> handler short-circuits to [] (no bookings query).
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        response = client.get("/api/v1/bookings/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    finally:
        app.dependency_overrides = {}
