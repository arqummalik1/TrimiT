"""Tests for the admin web dashboard: PIN login + data endpoints + pageview.

The PIN is exchanged server-side for the bearer token; data endpoints stay
behind the bearer guard. Dashboard service calls are monkeypatched so we test
the routing/auth, not Supabase.
"""

from fastapi import status
from httpx import Response

TOKEN = "admin-token-xyz"
PIN = "738261"


async def _ret(v):
    return v


def _cfg(monkeypatch, *, token=TOKEN, pin=PIN):
    from config import settings
    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", token)
    monkeypatch.setattr(settings, "ADMIN_DASHBOARD_PIN", pin)


# ── PIN login ─────────────────────────────────────────────────────────────────

def test_login_success_returns_token(client, monkeypatch):
    _cfg(monkeypatch)
    resp = client.post("/api/v1/admin/login", json={"pin": PIN})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["token"] == TOKEN


def test_login_wrong_pin(client, monkeypatch):
    _cfg(monkeypatch)
    resp = client.post("/api/v1/admin/login", json={"pin": "000000"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
    assert resp.json()["error"]["details"]["code"] == "INVALID_PIN"


def test_login_disabled_when_pin_unset(client, monkeypatch):
    _cfg(monkeypatch, pin=None)
    resp = client.post("/api/v1/admin/login", json={"pin": "738261"})
    assert resp.status_code == status.HTTP_404_NOT_FOUND


# ── data endpoints (bearer-guarded) ───────────────────────────────────────────

def test_overview_requires_bearer(client, monkeypatch):
    _cfg(monkeypatch)
    assert client.get("/api/v1/admin/dashboard/overview").status_code == status.HTTP_401_UNAUTHORIZED


def test_overview_success(client, monkeypatch):
    _cfg(monkeypatch)
    from routers import admin as admin_router
    monkeypatch.setattr(admin_router.dashboard, "get_overview",
                        lambda: _ret({"totals": {"owners": 2, "customers": 5}}))
    resp = client.get("/api/v1/admin/dashboard/overview", headers={"Authorization": f"Bearer {TOKEN}"})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["totals"]["owners"] == 2


def test_owners_success(client, monkeypatch):
    _cfg(monkeypatch)
    from routers import admin as admin_router
    monkeypatch.setattr(admin_router.dashboard, "list_owners",
                        lambda: _ret([{"owner_id": "o1", "subscription_status": "trial", "trial_days_remaining": 12}]))
    resp = client.get("/api/v1/admin/dashboard/owners", headers={"Authorization": f"Bearer {TOKEN}"})
    assert resp.status_code == status.HTTP_200_OK
    owners = resp.json()["owners"]
    assert owners[0]["subscription_status"] == "trial"
    assert owners[0]["trial_days_remaining"] == 12


def test_owners_wrong_token(client, monkeypatch):
    _cfg(monkeypatch)
    resp = client.get("/api/v1/admin/dashboard/owners", headers={"Authorization": "Bearer nope"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_customers_success(client, monkeypatch):
    _cfg(monkeypatch)
    from routers import admin as admin_router
    monkeypatch.setattr(admin_router.dashboard, "list_customers",
                        lambda: _ret([{"id": "c1", "name": "A"}]))
    resp = client.get("/api/v1/admin/dashboard/customers", headers={"Authorization": f"Bearer {TOKEN}"})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["customers"][0]["id"] == "c1"


# ── public pageview tracking ──────────────────────────────────────────────────

def test_pageview_records(client, mock_supabase):
    mock_supabase.post("/rest/v1/page_views").mock(return_value=Response(201, json={}))
    resp = client.post("/api/v1/analytics/pageview", json={"path": "/", "session_id": "s1"})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["status"] == "ok"


def test_pageview_best_effort_on_db_error(client, mock_supabase):
    mock_supabase.post("/rest/v1/page_views").mock(return_value=Response(500, json={}))
    resp = client.post("/api/v1/analytics/pageview", json={"path": "/explore"})
    # Never fail the client over analytics.
    assert resp.status_code == status.HTTP_200_OK
