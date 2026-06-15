import pytest
import respx
from config import settings
from fastapi.testclient import TestClient
from httpx import Response
from server import app


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
