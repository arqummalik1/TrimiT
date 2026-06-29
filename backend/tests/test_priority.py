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
