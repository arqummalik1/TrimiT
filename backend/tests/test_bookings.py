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


EXPECTED_CUSTOMER_EMBED = "users:users!bookings_user_id_fkey(id,name,phone)"


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


def _booking_read_calls(mock_supabase):
    return [
        call
        for call in mock_supabase.called
        if call[0] == "GET" and call[1].startswith("rest/v1/bookings?")
    ]


def _assert_explicit_customer_embed(call):
    method, path, kwargs = call
    assert method == "GET"
    assert f"select=*,salons(*),services(*),{EXPECTED_CUSTOMER_EMBED}" in path
    assert "users(*)" not in path
    assert kwargs.get("service_role") is True


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
        rows = [
            {
                "id": "b1",
                "user_id": "cust1",
                "status": "pending",
                "salons": {
                    "name": "Salon",
                    "bank_name": "Private Bank",
                    "bank_ifsc": "PRIVATE0001",
                },
            }
        ]
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=rows)
        response = client.get("/api/v1/bookings/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()[0]["salons"] == {"name": "Salon"}
        booking_calls = _booking_read_calls(mock_supabase)
        assert len(booking_calls) == 1
        assert "user_id=eq.cust1" in booking_calls[0][1]
        _assert_explicit_customer_embed(booking_calls[0])
    finally:
        app.dependency_overrides = {}


def test_list_my_bookings_owner_uses_explicit_customer_embed(client, mock_supabase):
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
        rows = [{"id": "b1", "user_id": "cust1", "salon_id": "s1"}]
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "s1"}, {"id": "s2"}]
        )
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=rows)

        response = client.get("/api/v1/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == rows
        booking_calls = _booking_read_calls(mock_supabase)
        assert len(booking_calls) == 1
        assert "salon_id=in.(s1,s2)" in booking_calls[0][1]
        _assert_explicit_customer_embed(booking_calls[0])
    finally:
        app.dependency_overrides = {}


def test_list_salon_bookings_uses_explicit_customer_embed(client, mock_supabase):
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
        rows = [{"id": "b1", "user_id": "cust1", "salon_id": "s1"}]
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "s1"}]
        )
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=rows)

        response = client.get("/api/v1/bookings/salon/s1")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == rows
        booking_calls = _booking_read_calls(mock_supabase)
        assert len(booking_calls) == 1
        assert "salon_id=eq.s1" in booking_calls[0][1]
        _assert_explicit_customer_embed(booking_calls[0])
    finally:
        app.dependency_overrides = {}


def test_list_salon_bookings_rejects_unmanaged_salon(client, mock_supabase):
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
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "a-different-salon"}]
        )

        response = client.get("/api/v1/bookings/salon/s1")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert _booking_read_calls(mock_supabase) == []
    finally:
        app.dependency_overrides = {}


def test_list_my_bookings_does_not_treat_postgrest_error_as_empty(
    client, mock_supabase
):
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
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            300,
            json={
                "code": "PGRST201",
                "message": "Ambiguous relationship",
            },
        )

        response = client.get("/api/v1/bookings/")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json() != []
        booking_calls = _booking_read_calls(mock_supabase)
        assert len(booking_calls) == 1
        _assert_explicit_customer_embed(booking_calls[0])
    finally:
        app.dependency_overrides = {}


def test_get_booking_uses_explicit_customer_embed_and_preserves_alias(
    client, mock_supabase
):
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
        row = {
            "id": "b1",
            "user_id": "cust1",
            "salon_id": "s1",
            "salons": {
                "name": "Salon",
                "bank_account_number": "private",
                "account_holder_name": "Private Owner",
            },
            "users": {"id": "cust1", "name": "Customer", "phone": "123"},
        }
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200, json=[row]
        )

        response = client.get("/api/v1/bookings/b1")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["users"] == row["users"]
        assert response.json()["salons"] == {"name": "Salon"}
        booking_calls = _booking_read_calls(mock_supabase)
        assert len(booking_calls) == 1
        assert "id=eq.b1" in booking_calls[0][1]
        _assert_explicit_customer_embed(booking_calls[0])
    finally:
        app.dependency_overrides = {}


def test_get_booking_missing_returns_404(client, mock_supabase):
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
        mock_supabase.get("/rest/v1/bookings").return_value = Response(200, json=[])

        response = client.get("/api/v1/bookings/missing")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        booking_calls = _booking_read_calls(mock_supabase)
        assert len(booking_calls) == 1
        _assert_explicit_customer_embed(booking_calls[0])
    finally:
        app.dependency_overrides = {}


def test_get_booking_rejects_other_customer(client, mock_supabase):
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
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[
                {
                    "id": "b1",
                    "user_id": "another-customer",
                    "salon_id": "s1",
                }
            ],
        )

        response = client.get("/api/v1/bookings/b1")

        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_get_booking_rejects_manager_of_different_salon(client, mock_supabase):
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
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[{"id": "b1", "user_id": "cust1", "salon_id": "s1"}],
        )
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "a-different-salon"}]
        )

        response = client.get("/api/v1/bookings/b1")

        assert response.status_code == status.HTTP_403_FORBIDDEN
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


def test_owner_cannot_complete_cancelled_booking(client, mock_supabase):
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
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[
                {
                    "id": "b1",
                    "user_id": "cust1",
                    "salon_id": "s1",
                    "status": "cancelled",
                }
            ],
        )
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "s1", "owner_id": "owner1"}]
        )
        response = client.patch(
            "/api/v1/bookings/b1/status", json={"status": "completed"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["code"] == "INVALID_STATUS_TRANSITION"
    finally:
        app.dependency_overrides = {}


def test_owner_cannot_confirm_unverified_upi(client, mock_supabase):
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
        # First GET is booking auth row; second GET (same path) is payment fields.
        mock_supabase.get("/rest/v1/bookings").return_value = Response(
            200,
            json=[
                {
                    "id": "b1",
                    "user_id": "cust1",
                    "salon_id": "s1",
                    "status": "pending",
                    "payment_method": "upi",
                    "payment_status": "pending",
                    "payment_verification_status": "waiting_verification",
                }
            ],
        )
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"id": "s1", "owner_id": "owner1"}]
        )
        response = client.patch(
            "/api/v1/bookings/b1/status", json={"status": "confirmed"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["code"] == "PAYMENT_NOT_VERIFIED"
    finally:
        app.dependency_overrides = {}
