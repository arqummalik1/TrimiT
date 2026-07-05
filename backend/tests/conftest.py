import pytest
import respx
from config import settings
from fastapi.testclient import TestClient
from httpx import Response
from server import app


@pytest.fixture
def client():
    return TestClient(app)


class MockRoute:
    def __init__(self, routes, method, path):
        self.routes = routes
        self.method = method
        self.path = path
    
    @property
    def return_value(self):
        return self.routes.get((self.method, self.path))
        
    @return_value.setter
    def return_value(self, value):
        self.routes[(self.method, self.path)] = value
        
    def mock(self, return_value=None):
        if return_value is not None:
            self.return_value = return_value
        return self

class MockSupabase:
    def __init__(self):
        self.routes = {}
        self.called = []
        
    def _route(self, method, path):
        if not path.startswith("/"):
            path = "/" + path
        return MockRoute(self.routes, method, path)

    def get(self, path, **kwargs): return self._route("GET", path)
    def post(self, path, **kwargs): return self._route("POST", path)
    def put(self, path, **kwargs): return self._route("PUT", path)
    def patch(self, path, **kwargs): return self._route("PATCH", path)
    def delete(self, path, **kwargs): return self._route("DELETE", path)


@pytest.fixture
def mock_supabase(monkeypatch):
    ms = MockSupabase()
    
    async def fake_request(method, path, **kwargs):
        ms.called.append((method, path, kwargs))
        search_path = "/" + path if not path.startswith("/") else path
        
        if (method, search_path) in ms.routes:
            return ms.routes[(method, search_path)]
            
        for (m, p), resp in ms.routes.items():
            if m == method and (search_path == p or search_path.startswith(p + "?")):
                return resp
                
        raise AssertionError(f"RESPX: <Request(b'{method}', '{settings.SUPABASE_URL}{search_path}')> not mocked!")

    monkeypatch.setattr("core.supabase.supabase.request", fake_request)
    yield ms


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer mock_token"}
