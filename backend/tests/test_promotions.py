"""Tests for /api/v1/promotions/* — validate + owner CRUD."""

from fastapi import status
from httpx import Response


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


# ── validate ────────────────────────────────────────────────────────────────

def test_validate_requires_auth(client):
    response = client.post(
        "/api/v1/promotions/validate",
        json={"code": "SAVE10", "salon_id": "s1", "booking_amount": 500},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_validate_returns_rpc_verdict(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "cust1", "access_token": "tok"})
    try:
        mock_supabase.post("/rest/v1/rpc/validate_promo_code").return_value = Response(
            200,
            json={"valid": True, "discount_amount": 50, "final_amount": 450},
        )
        response = client.post(
            "/api/v1/promotions/validate",
            json={"code": "save10", "salon_id": "s1", "booking_amount": 500},
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["valid"] is True
        assert body["discount_amount"] == 50
    finally:
        app.dependency_overrides = {}


def test_validate_rpc_failure_returns_invalid(client, mock_supabase):
    app = client.app
    _override_user(app, {"id": "cust1", "access_token": "tok"})
    try:
        # Non-200 from RPC -> handler returns valid=False (HTTP 200, not an error).
        mock_supabase.post("/rest/v1/rpc/validate_promo_code").return_value = Response(
            500, json={}
        )
        response = client.post(
            "/api/v1/promotions/validate",
            json={"code": "BAD", "salon_id": "s1", "booking_amount": 500},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["valid"] is False
    finally:
        app.dependency_overrides = {}


# ── owner list ──────────────────────────────────────────────────────────────

def test_owner_promotions_rejects_non_owner(client):
    app = client.app
    _override_user(
        app, {"id": "u1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        response = client.get("/api/v1/promotions/owner")
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides = {}


def test_owner_promotions_empty_when_no_salon(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}}
    )
    try:
        mock_supabase.get("/rest/v1/salons").return_value = Response(200, json=[])
        response = client.get("/api/v1/promotions/owner")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    finally:
        app.dependency_overrides = {}


# ── create ──────────────────────────────────────────────────────────────────

def _promo_payload(salon_id="s1"):
    return {
        "code": "SAVE10",
        "discount_type": "percent",
        "discount_value": 10,
        "salon_id": salon_id,
    }


def test_create_promotion_blocks_global(client):
    # No salon_id -> global promo -> 403 (not yet supported). Customer role passes
    # require_active_subscription untouched, so the 403 comes from the global check.
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        payload = {"code": "GLOBAL10", "discount_type": "percent", "discount_value": 10}
        response = client.post("/api/v1/promotions/", json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Global promotions" in response.json()["error"]["message"]
    finally:
        app.dependency_overrides = {}


def test_create_promotion_success(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        # assert_salon_owner (service_role) confirms ownership.
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"owner_id": "owner1"}]
        )
        mock_supabase.post("/rest/v1/promotions").return_value = Response(
            201, json=[{"id": "p1", "code": "SAVE10"}]
        )
        response = client.post("/api/v1/promotions/", json=_promo_payload())
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == "p1"
    finally:
        app.dependency_overrides = {}


# ── update / delete ─────────────────────────────────────────────────────────

def test_update_promotion_404(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.get("/rest/v1/promotions").return_value = Response(200, json=[])
        response = client.patch("/api/v1/promotions/p-missing", json={"active": False})
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        app.dependency_overrides = {}


def test_delete_promotion_soft_deletes(client, mock_supabase):
    app = client.app
    _override_user(
        app, {"id": "owner1", "access_token": "tok", "profile": {"role": "customer"}}
    )
    try:
        mock_supabase.get("/rest/v1/promotions").return_value = Response(
            200, json=[{"salon_id": "s1"}]
        )
        # ownership check (service_role)
        mock_supabase.get("/rest/v1/salons").return_value = Response(
            200, json=[{"owner_id": "owner1"}]
        )
        mock_supabase.patch("/rest/v1/promotions").return_value = Response(204)
        response = client.delete("/api/v1/promotions/p1")
        assert response.status_code == status.HTTP_200_OK
        assert "deleted" in response.json()["message"]
    finally:
        app.dependency_overrides = {}
