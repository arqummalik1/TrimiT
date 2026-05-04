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
