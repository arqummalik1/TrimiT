"""Tests for POST /admin/grant-subscription — the manual activation escape hatch.

Admin-token guarded (same as the rest of the admin router). The service calls
(ensure_trial / update_subscription) are monkeypatched so we test the endpoint's
auth + response, not Supabase.
"""

from fastapi import status


ADMIN_TOKEN = "secret-admin-token"


async def _async_return(value):
    return value


def test_grant_401_without_token(client, monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", ADMIN_TOKEN)
    resp = client.post("/api/v1/admin/grant-subscription", json={"owner_id": "o1", "days": 30})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_grant_403_wrong_token(client, monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", ADMIN_TOKEN)
    resp = client.post(
        "/api/v1/admin/grant-subscription",
        json={"owner_id": "o1", "days": 30},
        headers={"Authorization": "Bearer nope"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_grant_success(client, monkeypatch):
    from config import settings
    from routers import admin as admin_router

    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", ADMIN_TOKEN)
    monkeypatch.setattr(admin_router.subs, "ensure_trial", lambda oid: _async_return({"id": "sub1", "owner_id": oid}))
    monkeypatch.setattr(
        admin_router.subs, "update_subscription",
        lambda *a, **k: _async_return({"id": "sub1", "status": "active"}),
    )
    resp = client.post(
        "/api/v1/admin/grant-subscription",
        json={"owner_id": "o1", "days": 30},
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    )
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["status"] == "active"
    assert body["owner_id"] == "o1"
    assert "current_period_end" in body


def test_grant_rejects_bad_days(client, monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", ADMIN_TOKEN)
    resp = client.post(
        "/api/v1/admin/grant-subscription",
        json={"owner_id": "o1", "days": 0},  # ge=1 → 422
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
