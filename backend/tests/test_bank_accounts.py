"""Tests for Layer A — owner bank/KYC (`/api/v1/owner/bank-accounts`).

Covers the router access control (owner-only, single-tenant, structured errors)
and the canonical-storage service (full-number encryption at rest + masking in
responses, one-row-per-salon upsert).

All Supabase REST traffic is intercepted by respx (see ``mock_supabase`` in
conftest) — no real network. Sensitive-field encryption is exercised with a
throwaway test ``FIELD_ENCRYPTION_KEY`` configured via monkeypatch.

Validates: Requirements 1.4, 1.6, 1.7, 1.8, 1.9, 2.2, 2.3.
"""

import json

import pytest
from cryptography.fernet import Fernet
from fastapi import status
from httpx import Response

from core import crypto
from core.supabase import supabase

# Full mounted paths (v1 prefix + router prefix).
POST_URL = "/api/v1/owner/bank-accounts/"
GET_URL = "/api/v1/owner/bank-accounts"

# A valid Bank_KYC_Record body that passes Pydantic model validation.
# account_number ends in 3456 → last4 "3456"; PAN "ABCDE1234F" → last4 "234F".
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
CUSTOMER_USER = {"id": "cust1", "access_token": "tok", "profile": {"role": "customer"}}


def _full_db_row():
    """A complete `salon_bank_accounts` row as returned by `select=*`.

    Includes encrypted columns to prove they are stripped before the response.
    """
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
        "vendor_status": "not_registered",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


def _override_user(app, user):
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture
def enc_key(monkeypatch):
    """Configure a throwaway Fernet key and reset the cached Fernet instance."""
    key = Fernet.generate_key().decode("utf-8")
    monkeypatch.setattr(crypto.settings, "FIELD_ENCRYPTION_KEY", key)
    crypto._get_fernet.cache_clear()
    yield key
    crypto._get_fernet.cache_clear()


# ---------------------------------------------------------------------------
# 1. Auth required (Req 2.2 baseline — no identity, no access)
# ---------------------------------------------------------------------------


def test_get_requires_auth(client):
    response = client.get(GET_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_post_requires_auth(client):
    response = client.post(POST_URL, json=VALID_PAYLOAD)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# 2. Non-owner role rejected with structured FORBIDDEN_NOT_OWNER (Req 2.2)
# ---------------------------------------------------------------------------


def test_non_owner_post_forbidden(client, mock_supabase):
    app = client.app
    _override_user(app, CUSTOMER_USER)
    try:
        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["details"]["code"] == "FORBIDDEN_NOT_OWNER"
        # No Supabase write should have occurred.
        assert not mock_supabase.calls
    finally:
        app.dependency_overrides = {}


def test_non_owner_get_forbidden(client, mock_supabase):
    app = client.app
    _override_user(app, CUSTOMER_USER)
    try:
        response = client.get(GET_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["details"]["code"] == "FORBIDDEN_NOT_OWNER"
        assert not mock_supabase.calls
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 3. Owner with no owned salon (Req 2.3 tenancy — expose no data)
# ---------------------------------------------------------------------------


def test_owner_no_salon_post_400(client, mock_supabase):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        mock_supabase.get("/rest/v1/salons").mock(return_value=Response(200, json=[]))
        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["details"]["code"] == "NO_SALON"
    finally:
        app.dependency_overrides = {}


def test_owner_no_salon_get_403(client, mock_supabase):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        mock_supabase.get("/rest/v1/salons").mock(return_value=Response(200, json=[]))
        response = client.get(GET_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["details"]["code"] == "NO_SALON"
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 4. Valid create returns a MASKED record (Req 1.6)
# ---------------------------------------------------------------------------


def test_valid_create_returns_masked(client, mock_supabase, enc_key):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        mock_supabase.get("/rest/v1/salons").mock(
            return_value=Response(200, json=[{"id": "s1"}])
        )
        # No existing row → create path.
        mock_supabase.get(
            "/rest/v1/salon_bank_accounts", params__contains={"select": "id"}
        ).mock(return_value=Response(200, json=[]))
        mock_supabase.post("/rest/v1/salon_bank_accounts").mock(
            return_value=Response(201, json=[{"id": "new"}])
        )
        mock_supabase.get(
            "/rest/v1/salon_bank_accounts", params__contains={"select": "*"}
        ).mock(return_value=Response(200, json=[_full_db_row()]))

        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["account_number_last4"] == "3456"
        assert data["pan_last4"] == "234F"
        assert data["vendor_status"] == "not_registered"

        # Masking: the encrypted/full sensitive fields are never keys, and the
        # full PAN / account number never appear anywhere in the response.
        assert "account_number_enc" not in data
        assert "account_number" not in data  # only *_last4 is exposed
        assert "pan_enc" not in data
        assert "pan" not in data
        assert "gstin_enc" not in data
        body = json.dumps(data)
        assert "ABCDE1234F" not in body  # full PAN never exposed
        assert "123456783456" not in body  # full account number never exposed
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 5. Model-level validation → 422 (Req 1.8 IFSC, 1.9 PAN)
# ---------------------------------------------------------------------------


def test_invalid_ifsc_returns_422(client, mock_supabase):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        payload = {**VALID_PAYLOAD, "ifsc_code": "BADIFSC"}
        response = client.post(POST_URL, json=payload)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    finally:
        app.dependency_overrides = {}


def test_invalid_pan_returns_422(client, mock_supabase):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        payload = {**VALID_PAYLOAD, "pan": "BADPAN0000"}
        response = client.post(POST_URL, json=payload)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 6. Upsert/update path — one row per salon (Req 1.10)
# ---------------------------------------------------------------------------


def test_existing_row_triggers_update(client, mock_supabase, enc_key):
    app = client.app
    _override_user(app, OWNER_USER)
    try:
        mock_supabase.get("/rest/v1/salons").mock(
            return_value=Response(200, json=[{"id": "s1"}])
        )
        # Existing row present → PATCH (update) path, not POST.
        mock_supabase.get(
            "/rest/v1/salon_bank_accounts", params__contains={"select": "id"}
        ).mock(return_value=Response(200, json=[{"id": "x"}]))
        patch_route = mock_supabase.patch("/rest/v1/salon_bank_accounts").mock(
            return_value=Response(200, json=[{"id": "x"}])
        )
        mock_supabase.get(
            "/rest/v1/salon_bank_accounts", params__contains={"select": "*"}
        ).mock(return_value=Response(200, json=[_full_db_row()]))

        response = client.post(POST_URL, json=VALID_PAYLOAD)
        assert response.status_code == status.HTTP_200_OK
        # The update path must have been used. (No POST route is registered, so
        # an insert would raise an unmocked-request error and fail the test.)
        assert patch_route.called
        assert response.json()["account_number_last4"] == "3456"
    finally:
        app.dependency_overrides = {}


# ---------------------------------------------------------------------------
# 7. Service-level encryption at rest + masking (Req 1.4, 1.5, 1.6)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_service_encrypts_full_number_and_masks(mock_supabase, enc_key):
    from models.bank_accounts import BankAccountCreate
    from services.bank_account_service import register_bank_account

    # Force a fresh httpx client bound to this test's event loop.
    supabase._client = None
    try:
        mock_supabase.get(
            "/rest/v1/salon_bank_accounts", params__contains={"select": "id"}
        ).mock(return_value=Response(200, json=[]))
        post_route = mock_supabase.post("/rest/v1/salon_bank_accounts").mock(
            return_value=Response(201, json=[{"id": "new"}])
        )
        mock_supabase.get(
            "/rest/v1/salon_bank_accounts", params__contains={"select": "*"}
        ).mock(return_value=Response(200, json=[_full_db_row()]))

        payload = BankAccountCreate(**VALID_PAYLOAD)
        result = await register_bank_account("22222222-2222-2222-2222-222222222222", payload)

        # The outbound row stores the FULL number encrypted, never plaintext.
        sent = json.loads(post_route.calls.last.request.content)
        assert sent["account_number_enc"] != "123456783456"
        assert sent["account_number_last4"] == "3456"
        # Decrypting the stored ciphertext round-trips to the original (Req 1.4/1.5).
        assert crypto.decrypt(sent["account_number_enc"]) == "123456783456"
        # PAN is also encrypted, never stored in plaintext.
        assert sent["pan_enc"] != "ABCDE1234F"
        assert crypto.decrypt(sent["pan_enc"]) == "ABCDE1234F"

        # The returned masked dict exposes no encrypted/full sensitive values.
        assert "account_number_enc" not in result
        assert "account_number" not in result
        assert "pan_enc" not in result
        assert "gstin_enc" not in result
        assert result["account_number_last4"] == "3456"
        assert result["pan_last4"] == "234F"
    finally:
        supabase._client = None
