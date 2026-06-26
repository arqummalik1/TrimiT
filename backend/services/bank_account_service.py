"""Layer A — canonical secure storage of Bank_KYC_Record.

Rewrites the bank account service to persist the full Bank_KYC_Record into the
canonical ``public.salon_bank_accounts`` table (migration 48), with every
Sensitive_Field (full account number, PAN, GSTIN) encrypted at rest via
``core/crypto.py``. Responses are always MASKED — full account number, PAN, and
GSTIN values are never returned and never logged.

This layer NEVER contacts PayU. ``vendor_status`` stays at its DB default
(``not_registered``) on create and is preserved untouched on update; PayU vendor
registration is Layer B (a later task) and is the only thing that decrypts the
stored values.

Validates: Requirements 1.4 (store full account number), 1.5 (encrypt at rest),
1.6 (mask in responses), 1.7 (retain existing record on bad input), 1.8/1.9
(IFSC/PAN validation handled by the Pydantic model), 1.10 (one row per salon).
See design Correctness Properties 8 and 9.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import HTTPException

from core.crypto import encrypt, last4  # decrypt imported by Layer B (vendor reg)
from core.supabase import supabase
from core import feature_flags
from services import payu_service

logger = logging.getLogger("trimit")

# Columns safe to expose in a masked API response. Anything ending in ``_enc``
# (the encrypted Sensitive_Fields) is deliberately excluded.
_MASKED_FIELDS = (
    "id",
    "salon_id",
    "account_name",
    "account_number_last4",
    "ifsc_code",
    "pan_last4",
    "business_name",
    "contact_phone",
    "contact_email",
    "address_line",
    "pincode",
    "vendor_status",
    "status",
    "created_at",
    "updated_at",
)

# Fields required to build a complete Bank_KYC_Record (GSTIN is optional).
_REQUIRED_FIELDS = (
    "account_name",
    "account_number",
    "ifsc_code",
    "pan",
    "business_name",
    "contact_phone",
    "contact_email",
    "address_line",
    "pincode",
)

# Stored-row columns that must all be present for a salon's Bank_KYC_Record to be
# considered COMPLETE and eligible for PayU vendor registration (Req 3.1). The
# encrypted Sensitive_Fields are checked by their ``*_enc`` columns; GSTIN stays
# optional. ``account_number_last4`` / ``pan_last4`` are derived, so the ``*_enc``
# presence is the authoritative completeness signal.
_REQUIRED_ROW_FIELDS = (
    "account_name",
    "account_number_enc",
    "ifsc_code",
    "pan_enc",
    "business_name",
    "contact_phone",
    "contact_email",
    "address_line",
    "pincode",
)

# Vendor lifecycle states from which a (re)registration attempt is allowed.
# 'pending'/'active'/'suspended' are owned by PayU webhooks and are never
# clobbered by a fresh local attempt (Req 3.1, 3.3 resubmit).
_REGISTERABLE_STATUSES = ("not_registered", "rejected")


def _mask(row: Dict[str, Any]) -> Dict[str, Any]:
    """Project a DB row down to the masked, owner-facing fields only.

    Strips every ``*_enc`` Sensitive_Field and any plaintext value. Safe to log
    only because it contains no full account number / PAN / GSTIN.
    """
    return {key: row.get(key) for key in _MASKED_FIELDS}


def _get_field(payload: Any, name: str) -> Any:
    """Read ``name`` from either a Pydantic model or a plain dict payload."""
    if isinstance(payload, dict):
        return payload.get(name)
    return getattr(payload, name, None)


async def register_bank_account(salon_id: UUID, payload: Any) -> Dict[str, Any]:
    """Create or update the salon's Bank_KYC_Record and return a MASKED dict.

    ``payload`` is a validated ``BankAccountCreate`` model (the router passes the
    model) or an equivalent mapping. Sensitive_Fields are encrypted before
    persistence; the full plaintext account number, PAN, and GSTIN are never
    written to a plaintext column and never logged.

    Upserts one row per ``salon_id`` (one Bank_KYC_Record per salon, Req 1.10).
    On the update path, the PayU vendor lifecycle columns
    (``payu_vendor_id``, ``vendor_status``, ``vendor_rejection_reason``) are
    preserved — they are owned by Layer B and must not be reset on a bank edit.

    Raises:
        HTTPException 400: structured error if a required field is missing.
        HTTPException 500: structured error on a database failure.
    """
    # Defensive guard: the Pydantic model (Task 3) is the first line of
    # validation, but if the service is called with incomplete data, fail with a
    # structured field-level error and DO NOT touch any existing record (Req 1.7).
    missing = [name for name in _REQUIRED_FIELDS if not _get_field(payload, name)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "BANK_KYC_FIELD_MISSING",
                "message": f"Missing required field(s): {', '.join(missing)}.",
            },
        )

    account_number = str(_get_field(payload, "account_number"))
    pan = str(_get_field(payload, "pan"))
    gstin = _get_field(payload, "gstin")

    # Encrypt Sensitive_Fields; derive masked last4 from plaintext (Req 1.5).
    row: Dict[str, Any] = {
        "salon_id": str(salon_id),
        "account_name": _get_field(payload, "account_name"),
        "account_number_enc": encrypt(account_number),
        "account_number_last4": last4(account_number),
        "ifsc_code": _get_field(payload, "ifsc_code"),
        "pan_enc": encrypt(pan),
        "pan_last4": last4(pan),
        "business_name": _get_field(payload, "business_name"),
        "contact_phone": _get_field(payload, "contact_phone"),
        "contact_email": _get_field(payload, "contact_email"),
        "address_line": _get_field(payload, "address_line"),
        "pincode": _get_field(payload, "pincode"),
        # Encrypt GSTIN only when provided; otherwise store NULL.
        "gstin_enc": encrypt(gstin) if gstin else None,
        "status": "active",
        # NOTE: vendor_status is intentionally NOT set here. On create the DB
        # default ('not_registered') applies; on update we preserve the existing
        # value (Layer B owns it).
    }

    # Upsert: one row per salon_id. GET existing → PATCH if present, else POST.
    existing_resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=id",
        service_role=True,
    )
    existing_data = existing_resp.json() if existing_resp.status_code == 200 else []

    if existing_data:
        # Update path: never overwrite the PayU vendor lifecycle columns.
        resp = await supabase.request(
            "PATCH",
            f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}",
            json=row,
            service_role=True,
        )
    else:
        resp = await supabase.request(
            "POST",
            "rest/v1/salon_bank_accounts",
            json=row,
            service_role=True,
        )

    if resp.status_code not in (200, 201, 204):
        # Never log the request body — it carries encrypted Sensitive_Fields.
        logger.error("[BankAccount] Failed to save bank account: %s", resp.text)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "BANK_ACCOUNT_SAVE_FAILED",
                "message": "Failed to save bank account to database.",
            },
        )

    # Read the canonical row back and return only the masked projection.
    final_resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=*",
        service_role=True,
    )
    final_data = final_resp.json() if final_resp.status_code == 200 else []
    if not final_data:
        logger.error(
            "[BankAccount] Saved bank account could not be read back for salon %s",
            salon_id,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "BANK_ACCOUNT_SAVE_FAILED",
                "message": "Failed to load saved bank account.",
            },
        )

    return _mask(final_data[0])


async def get_bank_account(salon_id: UUID) -> Optional[Dict[str, Any]]:
    """Fetch the salon's Bank_KYC_Record as a MASKED dict, or ``None``.

    Never returns ``*_enc`` Sensitive_Fields or any plaintext sensitive value.
    """
    resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=*",
        service_role=True,
    )
    data = resp.json() if resp.status_code == 200 else []
    if not data:
        return None
    return _mask(data[0])


# ---------------------------------------------------------------------------
# Layer B bridge — PayU vendor registration (Req 3.1, 3.2, 3.3, 3.4, 3.6, 3.7)
# ---------------------------------------------------------------------------


async def _fetch_full_row(salon_id: UUID) -> Optional[Dict[str, Any]]:
    """Fetch the salon's FULL Bank_KYC_Record row (including ``*_enc``).

    Uses the service role because the encrypted Sensitive_Fields are required to
    build the PayU vendor-registration request. The full row is NEVER logged.
    """
    resp = await supabase.request(
        "GET",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}&select=*",
        service_role=True,
    )
    data = resp.json() if resp.status_code == 200 else []
    return data[0] if data else None


def _is_complete(row: Dict[str, Any]) -> bool:
    """Return True when every required column for vendor registration is present."""
    return all(row.get(name) for name in _REQUIRED_ROW_FIELDS)


def _extract_rejection_reason(result: Dict[str, Any]) -> str:
    """Pull a human-readable rejection reason from a PayU register_vendor result.

    Looks at the structured top-level field first, then the raw PayU body. Never
    contains decrypted Sensitive_Fields (the raw body is PayU's response, not the
    request payload).
    """
    reason = result.get("vendor_rejection_reason") or result.get("reason")
    if not reason:
        raw = result.get("raw")
        if isinstance(raw, dict):
            reason = raw.get("reason") or raw.get("message") or raw.get("error")
    return str(reason) if reason else "PayU rejected the vendor registration."


async def maybe_register_vendor(salon_id: UUID) -> Optional[Dict[str, Any]]:
    """Attempt PayU vendor registration after a Bank_KYC_Record is saved.

    Contract (Req 3.x):

    * Flag OFF → never contacts PayU; ``vendor_status`` stays ``not_registered``.
      Returns the current MASKED record (Req 3.6).
    * Flag ON + complete record + ``vendor_status`` in
      ``('not_registered','rejected')`` → calls ``payu_service.register_vendor``
      with the FULL row and applies the outcome:
        - ``pending``/``active`` → store ``payu_vendor_id`` + ``vendor_status``
          and clear any prior ``vendor_rejection_reason`` (fresh attempt; Req 3.1, 3.2).
        - ``rejected`` → store ``vendor_status='rejected'`` + the rejection reason,
          keep the record, allow resubmit (Req 3.3).
    * On timeout / exception / PATCH failure → leaves ``vendor_status`` unchanged,
      logs a retryable structured event, and returns the unchanged MASKED record.
      NEVER raises, so the owner's bank save never fails because PayU is
      unreachable (Req 3.4).

    Returns the MASKED record (or ``None`` if no record exists). Decrypted values
    are never logged.
    """
    full = await _fetch_full_row(salon_id)
    if not full:
        return None

    # Req 3.6: while the flag is OFF, store-only — never contact PayU and keep
    # vendor_status at not_registered (the DB default set on create).
    if not feature_flags.payu_payouts_enabled():
        return _mask(full)

    # Incomplete record → nothing to register yet; return current masked state.
    if not _is_complete(full):
        return _mask(full)

    # Already pending/active/suspended → owned by PayU webhooks; do not re-register.
    if full.get("vendor_status") not in _REGISTERABLE_STATUSES:
        return _mask(full)

    # Attempt registration. register_vendor must never see this wrapped result
    # logged with decrypted values; we pass the full row but never log it.
    try:
        result = await payu_service.register_vendor(full)
    except Exception:
        # Req 3.4: timeout / transport failure → retryable, status unchanged.
        logger.warning(
            "[BankAccount] Vendor registration retryable failure for salon %s: %s",
            salon_id,
            {"code": "VENDOR_REGISTRATION_RETRY",
             "message": "PayU vendor registration did not complete; retry later."},
        )
        return _mask(full)

    new_status = (result or {}).get("vendor_status")

    if new_status == "rejected":
        # Req 3.3: record rejection reason, keep record, allow resubmit.
        patch_payload: Dict[str, Any] = {
            "vendor_status": "rejected",
            "vendor_rejection_reason": _extract_rejection_reason(result),
        }
        payu_vendor_id = result.get("payu_vendor_id")
        if payu_vendor_id:
            patch_payload["payu_vendor_id"] = payu_vendor_id
    elif new_status in ("pending", "active"):
        # Req 3.1 / 3.2: store vendor id + status; clear stale rejection reason.
        patch_payload = {
            "vendor_status": new_status,
            "payu_vendor_id": result.get("payu_vendor_id"),
            "vendor_rejection_reason": None,
        }
    else:
        # Unknown / missing status → treat as retryable; leave status unchanged.
        logger.warning(
            "[BankAccount] Vendor registration returned unrecognized status for salon %s: %s",
            salon_id,
            {"code": "VENDOR_REGISTRATION_RETRY",
             "message": "PayU vendor registration returned no actionable status."},
        )
        return _mask(full)

    patch_resp = await supabase.request(
        "PATCH",
        f"rest/v1/salon_bank_accounts?salon_id=eq.{salon_id}",
        json=patch_payload,
        service_role=True,
    )
    if patch_resp.status_code not in (200, 204):
        # Persisting the new status failed → retryable, leave status unchanged.
        logger.warning(
            "[BankAccount] Failed to persist vendor_status for salon %s: %s",
            salon_id,
            {"code": "VENDOR_REGISTRATION_RETRY",
             "message": "Could not persist PayU vendor status; retry later."},
        )
        return _mask(full)

    # Reflect the persisted change in the returned masked record without an extra
    # round-trip (the patch succeeded).
    full.update(patch_payload)
    return _mask(full)
