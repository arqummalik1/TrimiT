import pytest
from fastapi import status
import hmac
import hashlib
from httpx import Response
from config import settings

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

def test_signature_guard_required_on_mutation(client):
    # Mutations (POST/PATCH/DELETE) require signature
    headers = {"Authorization": "Bearer mock_token"}
    response = client.post("/api/v1/bookings/", json={}, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Missing security signature" in response.json()["detail"]

def test_signature_validation_valid(client, mock_supabase):
    import time
    timestamp = str(int(time.time()))
    method = "POST"
    path = "/api/v1/bookings/"
    
    message = f"{method}|{path}|{timestamp}"
    valid_signature = hmac.new(
        settings.API_SIGNING_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Authorization": "Bearer mock_token",
        "X-Trimit-Signature": valid_signature,
        "X-Trimit-Timestamp": timestamp
    }
    
    # Mock auth check (since we bypass signature middleware, we hit auth Depends)
    # This assumes mock_token is handled by a mocked auth dependency or we mock the auth check itself
    # For now, this test verifies the middleware lets it pass if signature is valid
    
    # Mock Supabase responses for booking creation
    mock_supabase.get("/rest/v1/salons?id=eq.1").return_value = Response(200, json=[{"id": "1", "auto_accept": True}])
    mock_supabase.get("/rest/v1/services?id=eq.1").return_value = Response(200, json=[{"id": "1", "price": 100}])
    mock_supabase.post("/rest/v1/rpc/create_atomic_booking").return_value = Response(200, json={"success": True, "booking_id": "b123"})
    
    # We need to bypass the actual JWT decoding for tests or provide a valid-looking JWT
    # A simpler way is to mock get_current_user in the test
    from dependencies.auth import get_current_user
    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {"id": "u123", "access_token": "mock_token"}
    
    payload = {
        "salon_id": "1",
        "service_id": "1",
        "booking_date": "2024-05-01",
        "time_slot": "10:00",
        "payment_method": "cash"
    }
    
    response = client.post("/api/v1/bookings/", json=payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["booking_id"] == "b123"
    
    # Clean up overrides
    app.dependency_overrides = {}

def test_payment_verify_invalid_signature(client):
    from dependencies.auth import get_current_user
    app = client.app
    app.dependency_overrides[get_current_user] = lambda: {"id": "u123", "access_token": "mock_token"}
    
    # Valid request signing headers (for the middleware)
    import time
    timestamp = str(int(time.time()))
    msg = f"POST|/api/v1/payments/verify|{timestamp}"
    valid_sig = hmac.new(settings.API_SIGNING_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    headers = {"X-Trimit-Signature": valid_sig, "X-Trimit-Timestamp": timestamp}

    payload = {
        "booking_id": "b123",
        "razorpay_order_id": "ord_1",
        "razorpay_payment_id": "pay_1",
        "razorpay_signature": "invalid_razorpay_sig"
    }
    
    response = client.post("/api/v1/payments/verify", json=payload, headers=headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid signature" in response.json()["error"]["message"]
    
    app.dependency_overrides = {}

def test_signup_email_confirmation_required(client, mock_supabase):
    # Mock Supabase signup returning 200 but session is null (email confirmation required)
    mock_supabase.post("/auth/v1/signup").return_value = Response(200, json={
        "user": {
            "id": "u123",
            "email": "test@example.com"
        },
        "session": None
    })
    
    # Mock admin list to check if user exists (none)
    mock_supabase.get("/auth/v1/admin/users").return_value = Response(200, json={"users": []})
    mock_supabase.get("/rest/v1/users?email=eq.test%40example.com&select=id,email,role,name,phone").return_value = Response(200, json=[])

    payload = {
        "email": "test@example.com",
        "password": "Password123!",
        "name": "Test User",
        "phone": "+919876543210",
        "role": "customer"
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 202
    assert response.json()["code"] == "EMAIL_CONFIRMATION_REQUIRED"

def test_signup_unconfirmed_exists_retry(client, mock_supabase):
    # Mock check_existing_signup_state returns unconfirmed/pending
    mock_supabase.get("/rest/v1/users?email=eq.test%40example.com&select=id,email,role,name,phone").return_value = Response(200, json=[])
    mock_supabase.get("/auth/v1/admin/users").return_value = Response(200, json={
        "users": [{
            "id": "u123",
            "email": "test@example.com",
            "email_confirmed_at": None,
            "confirmed_at": None
        }]
    })
    
    # Mock profile creation database requests
    mock_supabase.get("/rest/v1/users?id=eq.u123&select=*").return_value = Response(200, json=[])
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
        "role": "customer"
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 202
    assert response.json()["code"] == "EMAIL_CONFIRMATION_REQUIRED"
    assert "pending registration" in response.json()["message"]

