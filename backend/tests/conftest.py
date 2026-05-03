import pytest
from fastapi.testclient import TestClient
from server import app
import respx
from httpx import Response
from config import settings

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_supabase():
    with respx.mock(base_url=settings.SUPABASE_URL) as respx_mock:
        yield respx_mock

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer mock_token"}

@pytest.fixture
def signature_headers():
    import hmac
    import hashlib
    import time
    
    timestamp = str(int(time.time()))
    # This mock fixture is often used for POST requests to bookings in tests
    method = "POST"
    path = "/api/v1/bookings/"
    
    message = f"{method}|{path}|{timestamp}"
    signature = hmac.new(
        settings.API_SIGNING_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return {
        "X-Trimit-Timestamp": timestamp,
        "X-Trimit-Signature": signature
    }
