"""Layer B — PayU gateway integration (hash, env, order, vendor, refund, webhook).

This module is the PayU client + pure helpers. It contains NO FastAPI endpoints
(those are later tasks); the routers call into these functions.

Money rule
----------
All internal amounts are integer **paise**. PayU's ``_payment`` API expects the
amount as a rupee string with 2 decimals (e.g. ``"100.00"``), so we convert
paise → rupee string ONLY at the PayU boundary via ``paise_to_rupee_str`` and
never store rupees internally.

Hashing (PayU Money / PayU India ``_payment`` scheme, SHA-512, lowercase hex)
----------------------------------------------------------------------------
Request hash (creating an order/transaction):

    key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT

Response / verify hash (reverse order):

    SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key

Webhook / server-to-server verification uses the same reverse-hash scheme over
the posted fields. Refund / merchant-API command hash:

    key|command|var1|SALT

Security
--------
- The PayU merchant key/salt are read from settings for the currently selected
  ``PAYU_MODE`` and are NEVER logged.
- Decrypted bank/KYC values (account number, PAN) are used only to build the
  PayU vendor-registration request and are NEVER logged or returned to callers.

Validates: Requirements 5.1, 5.2, 5.3, 5.4, 6.3, 13.1, 13.5.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from decimal import Decimal
from typing import Any, Mapping, Optional, Sequence, Union

import httpx

from config import settings
from core.crypto import decrypt

logger = logging.getLogger("trimit")

# PayU India endpoints. The order POST target is ``{base}/_payment``; the
# merchant API (refund / vendor) target is ``{base}/merchant/postservice``.
PAYU_TEST_BASE_URL = "https://test.payu.in"
PAYU_LIVE_BASE_URL = "https://secure.payu.in"

# Req 3.4: a PayU call that does not complete within 30 seconds is retryable.
_PAYU_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

UdfInput = Optional[Union[Mapping[str, Any], Sequence[Any]]]


# ---------------------------------------------------------------------------
# Environment / credential selection (Req 5.1, 5.2, 5.3)
# ---------------------------------------------------------------------------


def _mode() -> str:
    """Normalised PayU mode string ("test" or "live")."""
    return (settings.PAYU_MODE or "test").strip().lower()


def _get_credentials() -> tuple[str, str]:
    """Return ``(key, salt)`` for the currently selected ``PAYU_MODE``.

    "test" → ``PAYU_TEST_MERCHANT_KEY`` / ``PAYU_TEST_MERCHANT_SALT``.
    anything else (e.g. "live") → ``PAYU_MERCHANT_KEY`` / ``PAYU_MERCHANT_SALT``.

    Raises:
        RuntimeError: if the selected key/salt pair is unset. The error message
            names only the mode — never the key or salt value.
    """
    mode = _mode()
    if mode == "test":
        key = settings.PAYU_TEST_MERCHANT_KEY
        salt = settings.PAYU_TEST_MERCHANT_SALT
    else:
        key = settings.PAYU_MERCHANT_KEY
        salt = settings.PAYU_MERCHANT_SALT
    if not key or not salt:
        raise RuntimeError(f"PayU credentials not configured for mode={mode}")
    return key, salt


def _payu_base_url() -> str:
    """Return the PayU base URL for the selected mode (test vs live)."""
    return PAYU_TEST_BASE_URL if _mode() == "test" else PAYU_LIVE_BASE_URL


# ---------------------------------------------------------------------------
# Pure helpers — money + hashing
# ---------------------------------------------------------------------------


def paise_to_rupee_str(paise: int) -> str:
    """Convert integer paise to a PayU rupee string with exactly 2 decimals.

    ``100`` paise → ``"1.00"``; ``12345`` → ``"123.45"``; ``199`` → ``"1.99"``.
    Uses ``Decimal`` so we never touch floating point for money.

    Raises:
        ValueError: if ``paise`` is not an int (bools rejected too).
    """
    if isinstance(paise, bool) or not isinstance(paise, int):
        raise ValueError("paise must be an integer number of paise")
    rupees = (Decimal(paise) / Decimal(100)).quantize(Decimal("0.01"))
    return str(rupees)


def _sha512_hex(value: str) -> str:
    """SHA-512 hex digest (lowercase) of ``value``."""
    return hashlib.sha512(value.encode("utf-8")).hexdigest()


def _normalize_udf(udf: UdfInput) -> list[str]:
    """Normalise ``udf`` into exactly 5 string values (udf1..udf5).

    Accepts a mapping with keys ``udf1``..``udf5``, an ordered sequence, or
    ``None``. Missing entries become empty strings.
    """
    if udf is None:
        return ["", "", "", "", ""]
    if isinstance(udf, Mapping):
        return [str(udf.get(f"udf{i}", "") or "") for i in range(1, 6)]
    values = list(udf)
    return [str(values[i]) if i < len(values) else "" for i in range(5)]


def build_request_hash(
    txnid: str,
    amount_rupees_str: str,
    productinfo: str,
    firstname: str,
    email: str,
    udf: UdfInput = None,
) -> str:
    """Build the PayU ``_payment`` request hash (SHA-512, lowercase hex).

    Field order (documented PayU sequence):

        key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT

    ``amount_rupees_str`` must already be a 2-decimal rupee string (use
    ``paise_to_rupee_str``).
    """
    key, salt = _get_credentials()
    u = _normalize_udf(udf)
    hash_string = (
        f"{key}|{txnid}|{amount_rupees_str}|{productinfo}|{firstname}|{email}"
        f"|{u[0]}|{u[1]}|{u[2]}|{u[3]}|{u[4]}||||||{salt}"
    )
    return _sha512_hex(hash_string)


def build_command_hash(command: str, var1: str) -> str:
    """Build the PayU merchant-API command hash: ``key|command|var1|SALT``."""
    key, salt = _get_credentials()
    return _sha512_hex(f"{key}|{command}|{var1}|{salt}")


def _build_reverse_hash_string(posted: Mapping[str, Any], key: str, salt: str) -> str:
    """Build the reverse-hash source string from posted PayU fields.

    Order:

        SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    """
    status = str(posted.get("status", ""))
    u = _normalize_udf(
        {f"udf{i}": posted.get(f"udf{i}", "") for i in range(1, 6)}
    )
    email = str(posted.get("email", ""))
    firstname = str(posted.get("firstname", ""))
    productinfo = str(posted.get("productinfo", ""))
    amount = str(posted.get("amount", ""))
    txnid = str(posted.get("txnid", ""))
    return (
        f"{salt}|{status}||||||{u[4]}|{u[3]}|{u[2]}|{u[1]}|{u[0]}"
        f"|{email}|{firstname}|{productinfo}|{amount}|{txnid}|{key}"
    )


def _verify_reverse_hash(posted: Mapping[str, Any]) -> bool:
    """Shared reverse-hash verification for callbacks and webhooks.

    Rebuilds the reverse hash from posted fields using the selected mode's
    credentials and constant-time compares against ``posted["hash"]``. A missing
    hash, unconfigured credentials, or mismatch all return ``False``.
    """
    posted_hash = posted.get("hash")
    if not posted_hash:
        return False
    try:
        key, salt = _get_credentials()
    except RuntimeError:
        return False
    expected = _sha512_hex(_build_reverse_hash_string(posted, key, salt))
    return hmac.compare_digest(expected, str(posted_hash).strip().lower())


def verify_response_hash(posted: Mapping[str, Any]) -> bool:
    """Verify a PayU callback response hash (Req 8.1, 8.4). Missing hash → False."""
    return _verify_reverse_hash(posted)


def verify_webhook(posted: Mapping[str, Any]) -> bool:
    """Verify a PayU server-to-server webhook hash (Req 10.1, 10.2).

    PayU webhooks post the same field set as the callback, so the same
    reverse-hash scheme applies. Missing/invalid hash → ``False``.
    """
    return _verify_reverse_hash(posted)


# ---------------------------------------------------------------------------
# Split payload (shape depends on the activated PayU split product)
# ---------------------------------------------------------------------------


def _build_split_payload(vendor_id: Optional[str], split: Mapping[str, Any]) -> dict[str, Any]:
    """Build the PayU split/settlement params from a ``compute_split`` result.

    ``split`` is the ``services.commission.compute_split`` dict
    (``commission_paise``, ``payu_fee_paise``, ``vendor_paise``) and
    ``vendor_id`` is the salon's ``payu_vendor_id``.

    TODO(PayU split product): the exact param shape (e.g. ``splitInfo`` vs
    ``splitPaymentDetails``) and whether amounts are rupee strings or paise
    depend on the split product PayU activates on the account. This is kept
    isolated here so it can be finalised once PayU confirms the contract,
    without touching ``build_payment_params``. The vendor amount is the salon's
    net share (amount − commission − payu_fee), converted to a rupee string at
    the PayU boundary.
    """
    vendor_paise = int(split.get("vendor_paise", 0))
    vendor_rupees = paise_to_rupee_str(vendor_paise)
    # TODO(PayU): confirm the JSON structure / key name PayU expects.
    split_info = {
        "vendorId": vendor_id,
        "vendorAmount": vendor_rupees,
    }
    return {"splitInfo": json.dumps(split_info)}


def build_payment_params(
    txnid: str,
    amount_paise: int,
    productinfo: str,
    firstname: str,
    email: str,
    phone: str,
    success_url: str,
    failure_url: str,
    udf: UdfInput = None,
    split: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Build the PayU ``_payment`` form params dict for a checkout.

    Internal amount is paise; ``amount`` in the returned params is the rupee
    string PayU expects. The request hash is computed over the same rupee
    amount. When ``split`` is provided it must carry the salon's
    ``payu_vendor_id`` plus the ``compute_split`` breakdown; the split params
    are merged in via ``_build_split_payload``.
    """
    key, _ = _get_credentials()
    amount_str = paise_to_rupee_str(amount_paise)
    u = _normalize_udf(udf)
    params: dict[str, Any] = {
        "key": key,
        "txnid": txnid,
        "amount": amount_str,
        "productinfo": productinfo,
        "firstname": firstname,
        "email": email,
        "phone": phone,
        "surl": success_url,
        "furl": failure_url,
        "udf1": u[0],
        "udf2": u[1],
        "udf3": u[2],
        "udf4": u[3],
        "udf5": u[4],
        "hash": build_request_hash(
            txnid, amount_str, productinfo, firstname, email, udf
        ),
    }
    if split is not None:
        vendor_id = split.get("payu_vendor_id") or split.get("vendor_id")
        params.update(_build_split_payload(vendor_id, split))
    return params


# ---------------------------------------------------------------------------
# HTTP boundary (mocked in tests; never makes a real call under pytest)
# ---------------------------------------------------------------------------


async def _payu_post(url: str, data: Mapping[str, Any]) -> dict[str, Any]:
    """POST form-encoded ``data`` to PayU and return a parsed result dict.

    Returns ``{"status_code", "json"}`` for JSON responses, otherwise
    ``{"status_code", "text"}``. Tests monkeypatch this function so no real
    network call is made.
    """
    async with httpx.AsyncClient(timeout=_PAYU_TIMEOUT) as client:
        resp = await client.post(url, data=dict(data))
    content_type = resp.headers.get("content-type", "")
    if "application/json" in content_type:
        return {"status_code": resp.status_code, "json": resp.json()}
    return {"status_code": resp.status_code, "text": resp.text}


# ---------------------------------------------------------------------------
# Vendor registration (Req 3.x) — structured, guarded, never crashes
# ---------------------------------------------------------------------------


def _build_vendor_payload(bank_kyc_row: Mapping[str, Any], key: str) -> dict[str, Any]:
    """Build the PayU vendor/sub-merchant registration request.

    Decrypts the full account number and PAN ONLY to send them to PayU; these
    plaintext values are never logged or returned to callers.

    TODO(PayU vendor onboarding): the command name and field names below are
    placeholders. Finalise them once PayU confirms the activated split/vendor
    onboarding API contract.
    """
    account_number = (
        decrypt(bank_kyc_row["account_number_enc"])
        if bank_kyc_row.get("account_number_enc")
        else ""
    )
    pan = decrypt(bank_kyc_row["pan_enc"]) if bank_kyc_row.get("pan_enc") else ""
    # TODO(PayU): confirm command + field names for vendor onboarding.
    return {
        "key": key,
        "command": "create_vendor",  # TODO(PayU): confirm command name
        "accountName": bank_kyc_row.get("account_name", ""),
        "accountNumber": account_number,
        "ifsc": bank_kyc_row.get("ifsc_code", ""),
        "pan": pan,
        "businessName": bank_kyc_row.get("business_name", ""),
        "phone": bank_kyc_row.get("contact_phone", ""),
        "email": bank_kyc_row.get("contact_email", ""),
        "addressLine": bank_kyc_row.get("address_line", ""),
        "pincode": bank_kyc_row.get("pincode", ""),
    }


async def register_vendor(bank_kyc_row: Mapping[str, Any]) -> dict[str, Any]:
    """Register a salon as a PayU vendor/sub-merchant.

    Decrypts the stored bank/KYC sensitive fields, builds the registration
    request, and POSTs to PayU. Because the exact PayU split/vendor onboarding
    API depends on the activated product (not yet confirmed), this is guarded:
    if credentials are not configured for the current mode, or the call cannot
    complete, it returns a structured ``pending`` dict the caller (Task 11) can
    act on rather than crashing.

    Returns:
        ``{"vendor_status": "pending", "payu_vendor_id": None, "raw": ...}``.
        The returned dict NEVER contains decrypted account number / PAN.
    """
    try:
        key, _salt = _get_credentials()
    except RuntimeError:
        # Credentials missing for this mode → cannot register. Never log salt/key.
        logger.warning("PayU vendor registration skipped: credentials not configured")
        return {
            "vendor_status": "pending",
            "payu_vendor_id": None,
            "raw": {"error": "credentials_not_configured"},
        }

    try:
        payload = _build_vendor_payload(bank_kyc_row, key)
        base = _payu_base_url()
        # TODO(PayU): confirm the vendor-onboarding endpoint for the activated product.
        url = f"{base}/merchant/postservice?form=2"
        raw = await _payu_post(url, payload)
    except Exception:
        # Do not include the payload (decrypted PII) in the log.
        logger.warning("PayU vendor registration call failed", exc_info=True)
        return {
            "vendor_status": "pending",
            "payu_vendor_id": None,
            "raw": {"error": "registration_call_failed"},
        }

    # TODO(PayU): parse the real vendor id + status once PayU confirms the
    # response contract; until then we stay 'pending' and surface the raw body.
    return {"vendor_status": "pending", "payu_vendor_id": None, "raw": raw}


# ---------------------------------------------------------------------------
# Refund (Req 11.x) — structured, guarded
# ---------------------------------------------------------------------------


async def create_refund(
    payu_payment_id: str, amount_paise: int, txnid: str
) -> dict[str, Any]:
    """Create a PayU refund via the merchant API.

    Builds the command hash (``key|command|var1|SALT``) and POSTs the refund
    request. Amount is converted paise → rupee string at the PayU boundary.

    TODO(PayU merchant API): the exact command name (``cancel_refund_transaction``
    vs ``refundPayment``), endpoint, and var slots depend on the active PayU
    merchant API. Finalise once confirmed.

    Returns a structured dict; never raises on a transport error.
    """
    try:
        key, _salt = _get_credentials()
    except RuntimeError:
        return {
            "refund_status": "failed",
            "payu_payment_id": payu_payment_id,
            "amount_paise": amount_paise,
            "txnid": txnid,
            "raw": {"error": "credentials_not_configured"},
        }

    command = "cancel_refund_transaction"  # TODO(PayU): confirm command name
    amount_str = paise_to_rupee_str(amount_paise)
    command_hash = build_command_hash(command, payu_payment_id)
    # TODO(PayU): confirm var slots — var1=payment id, var2=refund ref, var3=amount.
    payload = {
        "key": key,
        "command": command,
        "var1": payu_payment_id,
        "var2": txnid,
        "var3": amount_str,
        "hash": command_hash,
    }
    base = _payu_base_url()
    url = f"{base}/merchant/postservice?form=2"

    try:
        raw = await _payu_post(url, payload)
    except Exception:
        logger.warning("PayU refund call failed", exc_info=True)
        return {
            "refund_status": "failed",
            "payu_payment_id": payu_payment_id,
            "amount_paise": amount_paise,
            "txnid": txnid,
            "raw": {"error": "refund_call_failed"},
        }

    return {
        "refund_status": "initiated",
        "payu_payment_id": payu_payment_id,
        "amount_paise": amount_paise,
        "txnid": txnid,
        "raw": raw,
    }
