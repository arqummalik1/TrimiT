import pytest
from fastapi import status
from httpx import Response


def test_health_check(client, mock_supabase):
    # Mock Supabase health check
    mock_supabase.get("/rest/v1/").return_value = Response(200, json={})

    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["dependencies"]["supabase"] == "ok"


def test_auth_guard_protected_route(client):
    # Auth/Me requires auth
    response = client.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_payment_verify_invalid_signature(client, mock_supabase):
    from dependencies.auth import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "u123",
        "access_token": "mock_token",
    }

    # The idempotency layer (required=True) claims a slot before the handler body
    # runs: a 201 insert wins the claim, and the post-failure HTTPException path
    # deletes the processing sentinel.
    mock_supabase.post("/rest/v1/idempotency_keys").return_value = Response(201, json={})
    mock_supabase.delete("/rest/v1/idempotency_keys").return_value = Response(204)
    # Handler loads the booking (owned by u123) before validating the signature.
    mock_supabase.get("/rest/v1/bookings").return_value = Response(
        200,
        json=[{"id": "b123", "user_id": "u123", "amount": 100, "payment_status": "pending"}],
    )

    payload = {
        "booking_id": "b123",
        "razorpay_order_id": "ord_1",
        "razorpay_payment_id": "pay_1",
        "razorpay_signature": "invalid_razorpay_sig",
    }

    # Idempotency-Key is mandatory; without it the request 400s on the missing
    # header before ever reaching signature validation.
    response = client.post(
        "/api/v1/payments/verify",
        json=payload,
        headers={"Idempotency-Key": "test-key-invalid-sig"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid signature" in response.json()["error"]["message"]

    app.dependency_overrides = {}


def test_signup_email_confirmation_required(client, mock_supabase):
    # Mock Supabase signup returning 200 (OTP sent successfully)
    mock_supabase.post("/auth/v1/otp").return_value = Response(200, json={})

    # Mock admin list to check if user exists (none)
    mock_supabase.get("/auth/v1/admin/users").return_value = Response(
        200, json={"users": []}
    )
    mock_supabase.get(
        "/rest/v1/users?email=eq.test%40example.com&select=id,email,role,name,phone"
    ).return_value = Response(200, json=[])

    payload = {
        "email": "test@example.com",
        "password": "Password123!",
        "name": "Test User",
        "phone": "+919876543210",
        "role": "customer",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 202
    assert response.json()["code"] == "EMAIL_CONFIRMATION_REQUIRED"


def test_signup_unconfirmed_exists_retry(client, mock_supabase):
    # Mock check_existing_signup_state returns unconfirmed/pending
    mock_supabase.get(
        "/rest/v1/users?email=eq.test%40example.com&select=id,email,role,name,phone"
    ).return_value = Response(200, json=[])
    mock_supabase.get("/auth/v1/admin/users").return_value = Response(
        200,
        json={
            "users": [
                {
                    "id": "u123",
                    "email": "test@example.com",
                    "email_confirmed_at": None,
                    "confirmed_at": None,
                }
            ]
        },
    )

    # Mock profile creation database requests
    mock_supabase.get("/rest/v1/users?id=eq.u123&select=*").return_value = Response(
        200, json=[]
    )
    mock_supabase.post("/rest/v1/users").return_value = Response(201, json={})

    # Mock admin confirm to fail so it falls back to actual resend
    mock_supabase.put("/auth/v1/admin/users/u123").return_value = Response(400, json={})

    # Mock resend confirmation email
    mock_supabase.post("/auth/v1/resend").return_value = Response(200, json={})

    payload = {
        "email": "test@example.com",
        "password": "Password123!",
        "name": "Test User",
        "phone": "+919876543210",
        "role": "customer",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 202
    assert response.json()["code"] == "EMAIL_CONFIRMATION_REQUIRED"
    assert "pending registration" in response.json()["message"]
