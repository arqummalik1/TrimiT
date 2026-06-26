"""Tests for Task 11 — PayU vendor registration bridge (Req 3.1, 3.2, 3.3, 3.4, 3.6, 3.7).

Exercises ``maybe_register_vendor`` through the live ``POST /owner/bank-accounts``
handler so the flag gating, non-fatal failure handling, and ``vendor_status``
transitions are verified end-to-end.

All Supabase REST traffic is intercepted by respx (``mock_supabase``). PayU is
never contacted: ``payu_service.register_vendor`` and
``feature_flags.payu_payouts_enabled`` are monkeypatched. A throwaway
``FIELD_ENCRYPTION_KEY`` is configured so the save path can encrypt.
"""

import json

import pytest
from cryptography.fernet import Fernet
from fastapi import status
from httpx import Response

from core import crypto
from core import feature_flags
from services import payu_service

POST_URL = "/api/v1/owner/bank-accounts/"

VALID_PAYLOAD = {
    "account_name": "Jane Doe",
    "account_number": "123456783456",
    "ifsc_code": "HDFC0001234",
    "pan": "ABCDE1234F",
    "business_name": "Jane Salon Pvt Ltd",
    "contact_phone": "9999999999",
    "contact_email": "jane@example.com",
    "address_line": "1 MG Road",
    "pincode": "560001",
    "gstin": None,
}

OWNER_USER = {"id": "owner1", "access_token": "tok", "profile": {"role": "owner"}}


def _full_db_row(vendor_status="not_registered"):
    """A complete `salon_bank_accounts` row (select=*) eligible for registration."""
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "salon_id": "22222222-2222-2222-2222-222222222222",
        "account_name": "Jane Doe",
        "account_number_enc": "gAAAAA_fake_ciphertext_token",
        "account_number_last4": "3456",
        "ifsc_code": "HDFC0001234",
        "pan_enc": "gAAAAA_fake_pan_token",
        "pan_last4": "234F",
        "gstin_enc": None,
        "business_name": "Jane Salon Pvt Ltd",
        "contact_phone": "9999999999",
        "contact_email": "jane@example.com",
        "address_line": "1 MG Road",
        "pincode": "560001",
        "payu_vendor_id": None,
        "vendor_status": vendor_status,
        "vendor_rejection_reason": None,
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture
def enc_key(monkeypatch):
    key = Fernet.generate_key().decode("utf-8")
    monkeypatch.setattr(crypto.settings, "FIELD_ENCRYPTION_KEY", key)
    crypto._get_fernet.cache_clear()
    yield key
    crypto._get_fernet.cache_clear()


def _mock_save_path(mock_supabase, row):
    """Mock the owner→salon resolve + create save path used by register_bank_account."""
    mock_supabase.get("/rest/v1/salons").mock(
        return_value=Response(200, json=[{"id": "s1"}])
    )
    # No existing row → create (POST) path.
    mock_supabase.get(
        "/rest/v1/salon_bank_accounts", params__contains={"select": "id"}
    ).mock(return_value=Response(200, json=[]))
    mock_supabase.post("/rest/v1/salon_bank_accounts").mock(
        return_value=Response(201, json=[{"id": "new"}])
    )
    # Both register_bank_account and maybe_register_vendor read select=* back.
    mock_supabase.get(
        "/rest/v1/salon_bank_accounts", params__contains={"select": "*"}
    ).mock(return_value=Response(200, json=[row]))


# ---------------------------------------------------------------------------
# Req 3.6 — flag OFF: store only, never contact PayU, vendor_status unchanged.
# ---------------------------------------------------------------------------


def test_flag_off_does_not_register(client, mock_supabase, enc_key, monkeypatch):
    app = client.app
    _override_user(app, OWNER_USER)
    calls = []

    async def _spy_register(_row):
        calls.append(_row)
        return {"vendor_status": "pending", "payu_vendor_id": "X", "raw": {}}

    monkeypatch.setattr(feature_flags, "payu_payouts_enabled", lambda: False)
    monkeypatch.setattr(payu_service, "register_vendor", _spy_register)
    try:
        _mock_save_path(mock_supabase, _full_db_row())

        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["vendor_status"] == "not_registered"
        # PayU never contacted. No PATCH route is mocked, so any vendor PATCH
        # attempt would raise an unmocked-request error and fail this test.
        assert calls == []
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# Req 3.1 — flag ON + complete + not_registered → register, status pending.
# ---------------------------------------------------------------------------


def test_flag_on_registers_pending(client, mock_supabase, enc_key, monkeypatch):
    app = client.app
    _override_user(app, OWNER_USER)

    async def _ok_register(_row):
        return {"vendor_status": "pending", "payu_vendor_id": "PAYU_VENDOR_123", "raw": {}}

    monkeypatch.setattr(feature_flags, "payu_payouts_enabled", lambda: True)
    monkeypatch.setattr(payu_service, "register_vendor", _ok_register)
    try:
        _mock_save_path(mock_supabase, _full_db_row())
        patch_route = mock_supabase.patch("/rest/v1/salon_bank_accounts").mock(
            return_value=Response(200, json=[{"id": "x"}])
        )

        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["vendor_status"] == "pending"

        # salon_bank_accounts PATCHed with the returned id + pending status.
        assert patch_route.called
        sent = json.loads(patch_route.calls.last.request.content)
        assert sent["vendor_status"] == "pending"
        assert sent["payu_vendor_id"] == "PAYU_VENDOR_123"
        assert sent["vendor_rejection_reason"] is None
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# Req 3.4 — flag ON but PayU times out/raises: save still succeeds, no 500.
# ---------------------------------------------------------------------------


def test_flag_on_payu_timeout_is_non_fatal(client, mock_supabase, enc_key, monkeypatch):
    app = client.app
    _override_user(app, OWNER_USER)

    async def _boom(_row):
        raise TimeoutError("PayU did not respond within 30s")

    monkeypatch.setattr(feature_flags, "payu_payouts_enabled", lambda: True)
    monkeypatch.setattr(payu_service, "register_vendor", _boom)
    try:
        _mock_save_path(mock_supabase, _full_db_row())

        response = client.post(POST_URL, json=VALID_PAYLOAD)
        # Bank save still succeeds; vendor_status unchanged; no 500. No PATCH
        # route is mocked, so a vendor status write would fail this test.
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["vendor_status"] == "not_registered"
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# Req 3.3 — flag ON + PayU rejects: vendor_status rejected + reason stored.
# ---------------------------------------------------------------------------


def test_flag_on_payu_rejected_stores_reason(client, mock_supabase, enc_key, monkeypatch):
    app = client.app
    _override_user(app, OWNER_USER)

    async def _rejected(_row):
        return {
            "vendor_status": "rejected",
            "payu_vendor_id": None,
            "raw": {"reason": "PAN name mismatch"},
        }

    monkeypatch.setattr(feature_flags, "payu_payouts_enabled", lambda: True)
    monkeypatch.setattr(payu_service, "register_vendor", _rejected)
    try:
        _mock_save_path(mock_supabase, _full_db_row())
        patch_route = mock_supabase.patch("/rest/v1/salon_bank_accounts").mock(
            return_value=Response(200, json=[{"id": "x"}])
        )

        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["vendor_status"] == "rejected"

        assert patch_route.called
        sent = json.loads(patch_route.calls.last.request.content)
        assert sent["vendor_status"] == "rejected"
        assert sent["vendor_rejection_reason"] == "PAN name mismatch"
    finally:
        app.dependency_overrides = {}
