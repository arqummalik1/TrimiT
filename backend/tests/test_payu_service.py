"""Unit tests for Task 10 — services.payu_service (PayU integration layer).

All HTTP is mocked (the internal ``_payu_post`` is monkeypatched); NO real
network calls are made. Hashes are checked against an explicitly hand-built
pipe string + ``hashlib.sha512`` computed in the test itself, so the assertions
are self-consistent AND pin the documented field order.

Validates: Requirements 5.1, 5.2, 5.3, 5.4, 6.3, 13.1, 13.5.
"""

import hashlib

import pytest
from cryptography.fernet import Fernet

from core import crypto
from services import payu_service

# Fixed test credentials used across hashing tests.
TEST_KEY = "testkey123"
TEST_SALT = "testsalt456"
LIVE_KEY = "livekey789"
LIVE_SALT = "livesalt000"


def _sha512(value: str) -> str:
    return hashlib.sha512(value.encode("utf-8")).hexdigest()


@pytest.fixture
def test_mode_creds(monkeypatch):
    """Select PayU test mode with fixed test key/salt."""
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "test")
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_KEY", TEST_KEY)
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_SALT", TEST_SALT)
    return TEST_KEY, TEST_SALT


# ---------------------------------------------------------------------------
# paise_to_rupee_str
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "paise,expected",
    [
        (100, "1.00"),
        (12345, "123.45"),
        (199, "1.99"),
        (1, "0.01"),
        (0, "0.00"),
        (9_999_999_999, "99999999.99"),
    ],
)
def test_paise_to_rupee_str(paise, expected):
    assert payu_service.paise_to_rupee_str(paise) == expected


def test_paise_to_rupee_str_rejects_non_int():
    with pytest.raises(ValueError):
        payu_service.paise_to_rupee_str(1.5)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        payu_service.paise_to_rupee_str(True)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# _get_credentials / _payu_base_url
# ---------------------------------------------------------------------------


def test_get_credentials_test_mode(test_mode_creds):
    assert payu_service._get_credentials() == (TEST_KEY, TEST_SALT)


def test_get_credentials_live_mode(monkeypatch):
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "live")
    monkeypatch.setattr(payu_service.settings, "PAYU_MERCHANT_KEY", LIVE_KEY)
    monkeypatch.setattr(payu_service.settings, "PAYU_MERCHANT_SALT", LIVE_SALT)
    assert payu_service._get_credentials() == (LIVE_KEY, LIVE_SALT)


def test_get_credentials_missing_raises(monkeypatch):
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "test")
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_KEY", None)
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_SALT", None)
    with pytest.raises(RuntimeError, match="PayU credentials not configured for mode=test"):
        payu_service._get_credentials()


def test_payu_base_url_test(monkeypatch):
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "test")
    assert payu_service._payu_base_url() == "https://test.payu.in"


def test_payu_base_url_live(monkeypatch):
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "live")
    assert payu_service._payu_base_url() == "https://secure.payu.in"


# ---------------------------------------------------------------------------
# build_request_hash — documented field order
# ---------------------------------------------------------------------------


def test_build_request_hash_matches_documented_order(test_mode_creds):
    key, salt = test_mode_creds
    txnid = "TXN001"
    amount = "100.00"
    productinfo = "Haircut"
    firstname = "Asha"
    email = "asha@example.com"
    udf = {"udf1": "a", "udf2": "b", "udf3": "c", "udf4": "d", "udf5": "e"}

    # Build the expected pipe string EXPLICITLY in the documented order:
    # key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    expected_string = (
        f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}"
        f"|a|b|c|d|e||||||{salt}"
    )
    expected_hash = _sha512(expected_string)

    actual = payu_service.build_request_hash(
        txnid, amount, productinfo, firstname, email, udf
    )
    assert actual == expected_hash
    assert actual == actual.lower()


def test_build_request_hash_empty_udf(test_mode_creds):
    key, salt = test_mode_creds
    # Documented order with 5 empty udf fields + 5 trailing empty fields:
    # key|txnid|amount|productinfo|firstname|email|udf1..udf5|||||SALT
    fields = [key, "T1", "5.00", "P", "F", "e@x.com", "", "", "", "", "", "", "", "", "", "", salt]
    expected_string = "|".join(fields)
    assert payu_service.build_request_hash("T1", "5.00", "P", "F", "e@x.com") == _sha512(
        expected_string
    )


# ---------------------------------------------------------------------------
# verify_response_hash / verify_webhook — reverse hash
# ---------------------------------------------------------------------------


def _make_posted(key: str, salt: str, status: str = "success") -> dict:
    """Build a posted dict with a correct reverse hash for the given creds."""
    posted = {
        "status": status,
        "udf1": "a",
        "udf2": "b",
        "udf3": "c",
        "udf4": "d",
        "udf5": "e",
        "email": "asha@example.com",
        "firstname": "Asha",
        "productinfo": "Haircut",
        "amount": "100.00",
        "txnid": "TXN001",
    }
    # Reverse order:
    # SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    reverse_string = (
        f"{salt}|{status}||||||e|d|c|b|a"
        f"|{posted['email']}|{posted['firstname']}|{posted['productinfo']}"
        f"|{posted['amount']}|{posted['txnid']}|{key}"
    )
    posted["hash"] = _sha512(reverse_string)
    return posted


def test_verify_response_hash_valid(test_mode_creds):
    key, salt = test_mode_creds
    posted = _make_posted(key, salt)
    assert payu_service.verify_response_hash(posted) is True


def test_verify_response_hash_tampered_field(test_mode_creds):
    key, salt = test_mode_creds
    posted = _make_posted(key, salt)
    posted["amount"] = "200.00"  # tamper after hashing
    assert payu_service.verify_response_hash(posted) is False


def test_verify_response_hash_tampered_hash(test_mode_creds):
    key, salt = test_mode_creds
    posted = _make_posted(key, salt)
    posted["hash"] = "deadbeef"
    assert payu_service.verify_response_hash(posted) is False


def test_verify_response_hash_missing_hash(test_mode_creds):
    key, salt = test_mode_creds
    posted = _make_posted(key, salt)
    del posted["hash"]
    assert payu_service.verify_response_hash(posted) is False


def test_verify_webhook_valid(test_mode_creds):
    key, salt = test_mode_creds
    posted = _make_posted(key, salt, status="success")
    assert payu_service.verify_webhook(posted) is True


def test_verify_webhook_invalid(test_mode_creds):
    key, salt = test_mode_creds
    posted = _make_posted(key, salt)
    posted["status"] = "failure"  # tamper
    assert payu_service.verify_webhook(posted) is False


def test_verify_webhook_missing_hash(test_mode_creds):
    assert payu_service.verify_webhook({"status": "success"}) is False


# ---------------------------------------------------------------------------
# build_payment_params
# ---------------------------------------------------------------------------


def test_build_payment_params_amount_is_rupees_and_hash_matches(test_mode_creds):
    key, salt = test_mode_creds
    params = payu_service.build_payment_params(
        txnid="TXN001",
        amount_paise=10000,  # ₹100.00
        productinfo="Haircut",
        firstname="Asha",
        email="asha@example.com",
        phone="9999999999",
        success_url="https://trimit.online/s",
        failure_url="https://trimit.online/f",
    )
    assert params["amount"] == "100.00"
    assert params["key"] == key
    assert params["surl"] == "https://trimit.online/s"
    # Hash matches the documented request order with empty udf.
    fields = [key, "TXN001", "100.00", "Haircut", "Asha", "asha@example.com",
              "", "", "", "", "", "", "", "", "", "", salt]
    expected_string = "|".join(fields)
    assert params["hash"] == _sha512(expected_string)


def test_build_payment_params_with_split(test_mode_creds):
    split = {
        "payu_vendor_id": "VENDOR_42",
        "amount_paise": 10000,
        "commission_paise": 500,
        "payu_fee_paise": 200,
        "vendor_paise": 9300,
    }
    params = payu_service.build_payment_params(
        txnid="TXN002",
        amount_paise=10000,
        productinfo="Haircut",
        firstname="Asha",
        email="asha@example.com",
        phone="9999999999",
        success_url="https://trimit.online/s",
        failure_url="https://trimit.online/f",
        split=split,
    )
    assert "splitInfo" in params
    assert "VENDOR_42" in params["splitInfo"]
    assert "93.00" in params["splitInfo"]  # vendor net as rupee string


# ---------------------------------------------------------------------------
# register_vendor — HTTP mocked, no decrypted PII leaks into result
# ---------------------------------------------------------------------------


@pytest.fixture
def configured_key(monkeypatch):
    key = Fernet.generate_key().decode("utf-8")
    monkeypatch.setattr(crypto.settings, "FIELD_ENCRYPTION_KEY", key)
    crypto._get_fernet.cache_clear()
    yield key
    crypto._get_fernet.cache_clear()


@pytest.mark.asyncio
async def test_register_vendor_returns_structured_dict(
    test_mode_creds, configured_key, monkeypatch
):
    account_number = "1234567890"
    pan = "ABCDE1234F"
    bank_kyc_row = {
        "account_name": "Asha Salon",
        "account_number_enc": crypto.encrypt(account_number),
        "account_number_last4": "7890",
        "ifsc_code": "HDFC0001234",
        "pan_enc": crypto.encrypt(pan),
        "business_name": "Asha Salon Pvt Ltd",
        "contact_phone": "9999999999",
        "contact_email": "asha@example.com",
        "address_line": "1 MG Road",
        "pincode": "560001",
    }

    canned = {"status_code": 200, "json": {"status": "received"}}

    async def fake_post(url, data):
        # Sanity: the decrypted PII IS sent to PayU (in the request payload)...
        assert data["accountNumber"] == account_number
        assert data["pan"] == pan
        return canned

    monkeypatch.setattr(payu_service, "_payu_post", fake_post)

    result = await payu_service.register_vendor(bank_kyc_row)

    assert result["vendor_status"] == "pending"
    assert result["payu_vendor_id"] is None
    assert result["raw"] == canned
    # ...but the decrypted PII NEVER appears in the returned dict.
    flat = repr(result)
    assert account_number not in flat
    assert pan not in flat


@pytest.mark.asyncio
async def test_register_vendor_pending_when_credentials_missing(monkeypatch):
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "test")
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_KEY", None)
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_SALT", None)

    result = await payu_service.register_vendor({"account_name": "X"})
    assert result["vendor_status"] == "pending"
    assert result["payu_vendor_id"] is None
    assert result["raw"]["error"] == "credentials_not_configured"


# ---------------------------------------------------------------------------
# create_refund — HTTP mocked
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_refund_returns_structured_dict(test_mode_creds, monkeypatch):
    canned = {"status_code": 200, "json": {"status": 1, "request_id": "R1"}}

    async def fake_post(url, data):
        # Refund uses the command hash scheme and rupee-string amount.
        assert data["command"] == "cancel_refund_transaction"
        assert data["var1"] == "PAYU_PAY_1"
        assert data["var3"] == "100.00"
        assert "hash" in data
        return canned

    monkeypatch.setattr(payu_service, "_payu_post", fake_post)

    result = await payu_service.create_refund("PAYU_PAY_1", 10000, "TXN001")
    assert result["refund_status"] == "initiated"
    assert result["payu_payment_id"] == "PAYU_PAY_1"
    assert result["amount_paise"] == 10000
    assert result["txnid"] == "TXN001"
    assert result["raw"] == canned


@pytest.mark.asyncio
async def test_create_refund_failed_when_credentials_missing(monkeypatch):
    monkeypatch.setattr(payu_service.settings, "PAYU_MODE", "test")
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_KEY", None)
    monkeypatch.setattr(payu_service.settings, "PAYU_TEST_MERCHANT_SALT", None)

    result = await payu_service.create_refund("PAYU_PAY_1", 10000, "TXN001")
    assert result["refund_status"] == "failed"
    assert result["raw"]["error"] == "credentials_not_configured"


# ---------------------------------------------------------------------------
# build_command_hash — documented order
# ---------------------------------------------------------------------------


def test_build_command_hash_order(test_mode_creds):
    key, salt = test_mode_creds
    expected = _sha512(f"{key}|verify_payment|PAYU_PAY_1|{salt}")
    assert payu_service.build_command_hash("verify_payment", "PAYU_PAY_1") == expected
