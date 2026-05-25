import pytest
from httpx import Response
from config import settings

def test_register_early_access_success(client, mock_supabase):
    email = "early-adopter@example.com"
    
    # 1. Mock GET (check if email exists) -> returns empty list (does not exist)
    mock_supabase.get(
        "/rest/v1/early_access_emails?email=eq.early-adopter%40example.com&select=id"
    ).mock(return_value=Response(200, json=[]))
    
    # 2. Mock POST (insert email) -> returns 201 Created
    mock_supabase.post("/rest/v1/early_access_emails").mock(
        return_value=Response(201, json=[{"id": "some-uuid", "email": email}])
    )
    
    response = client.post("/api/v1/early-access/", json={"email": email})
    assert response.status_code == 201
    assert response.json() == {"message": "Successfully registered for early access."}

def test_register_early_access_duplicate(client, mock_supabase):
    email = "existing@example.com"
    
    # 1. Mock GET -> returns an existing record
    mock_supabase.get(
        "/rest/v1/early_access_emails?email=eq.existing%40example.com&select=id"
    ).mock(return_value=Response(200, json=[{"id": "existing-uuid"}]))
    
    response = client.post("/api/v1/early-access/", json={"email": email})
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "This email has already registered for early access."

def test_register_early_access_invalid_email(client):
    response = client.post("/api/v1/early-access/", json={"email": "invalid-email-format"})
    assert response.status_code == 422
