"""Layer A — owner-facing bank/KYC router (`/owner/bank-accounts`).

Owner-only, single-tenant endpoints for submitting and reading a salon's
Bank_KYC_Record. The route prefix, methods, and paths are intentionally
unchanged so shipped Play Store builds keep working (Req 14.1, 14.2). Hardening
is additive: stricter access control, ownership resolved from the server side,
and consistent structured ``{code, message}`` errors.

Access-control invariants:
- Only a user whose role is ``owner`` may submit or read a Bank_KYC_Record
  (Req 2.2). Any other role gets a structured 403 and no data.
- The caller's ``salon_id`` is resolved from the salons they actually OWN
  (``salons.owner_id``) via the service role, never trusted from a
  client-suppliable value (Req 2.1, 2.3).
- Responses are always the MASKED projection produced by the service layer
  (full account number / PAN / GSTIN are never returned).

The request body is sensitive (full account number, PAN, GSTIN) and is NEVER
logged.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from dependencies.auth import get_current_user
from models.bank_accounts import BankAccountCreate, BankAccountResponse
from services.bank_account_service import (
    register_bank_account,
    get_bank_account,
    maybe_register_vendor,
)
from core.supabase import supabase

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/owner/bank-accounts", tags=["Bank Accounts"])


def _require_owner(current_user: dict) -> None:
    """Reject any caller whose role is not ``owner`` (Req 2.2).

    Raises a structured 403 and exposes no Bank_KYC_Record data.
    """
    profile = current_user.get("profile") or {}
    if profile.get("role") != "owner":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN_NOT_OWNER",
                "message": "Only salon owners can manage bank account details.",
            },
        )


async def _resolve_owned_salon_id(current_user: dict) -> Optional[UUID]:
    """Return the salon_id the caller owns, or ``None`` if they own no salon.

    Resolves tenancy server-side from ``salons.owner_id`` using the service role,
    so an owner can only ever operate on a salon they actually own (Req 2.1,
    2.3) — the client cannot supply or spoof a salon_id.
    """
    owner_id = current_user["id"]
    salon_resp = await supabase.request(
        "GET",
        f"rest/v1/salons?owner_id=eq.{owner_id}&select=id",
        service_role=True,
    )
    rows = salon_resp.json() if salon_resp.status_code == 200 else []
    if not rows:
        return None
    return rows[0]["id"]


@router.post("/", response_model=BankAccountResponse)
async def upsert_bank_account(
    account: BankAccountCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create or update the calling owner's Bank_KYC_Record (upsert).

    Owner-only (Req 2.2). Operates only on the salon the caller owns (Req 2.1).
    Returns the masked record. Never logs the request body (it is sensitive).
    """
    _require_owner(current_user)

    salon_id = await _resolve_owned_salon_id(current_user)
    if not salon_id:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "NO_SALON",
                "message": "No salon is associated with this owner account.",
            },
        )

    try:
        # Pass the full validated KYC model straight through; the service handles
        # encryption, masking, and one-row-per-salon upsert.
        saved = await register_bank_account(salon_id, account)
    except HTTPException:
        raise
    except Exception as e:
        # Never include the request body — it carries sensitive Bank/KYC fields.
        logger.error("[BankAccount] Unexpected error saving bank account: %s", e)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "BANK_ACCOUNT_SAVE_FAILED",
                "message": "Failed to save bank account.",
            },
        )

    # Layer B bridge (Req 3.1, 3.4, 3.6): after a successful save, attempt PayU
    # vendor registration when the flag is ON. This is strictly NON-FATAL — if
    # PayU is unreachable or registration fails, the bank details are already
    # saved and we still return the masked record (with vendor_status reflecting
    # reality). The owner's save never fails because of PayU.
    try:
        updated = await maybe_register_vendor(salon_id)
        if updated:
            return updated
    except Exception as e:
        logger.warning(
            "[BankAccount] Vendor registration step failed non-fatally: %s", e
        )

    return saved


@router.get("", response_model=BankAccountResponse)
async def fetch_bank_account(current_user: dict = Depends(get_current_user)):
    """Fetch the calling owner's masked Bank_KYC_Record.

    Owner-only (Req 2.2) and scoped to the caller's own salon (Req 2.1, 2.3).
    Exposes no data to non-owners or callers who own no salon.
    """
    _require_owner(current_user)

    salon_id = await _resolve_owned_salon_id(current_user)
    if not salon_id:
        # Owner role but owns no salon — expose no data (Req 2.3).
        raise HTTPException(
            status_code=403,
            detail={
                "code": "NO_SALON",
                "message": "No salon is associated with this owner account.",
            },
        )

    try:
        account_data = await get_bank_account(salon_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[BankAccount] Unexpected error reading bank account: %s", e)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "BANK_ACCOUNT_READ_FAILED",
                "message": "Failed to load bank account.",
            },
        )

    if not account_data:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "BANK_ACCOUNT_NOT_FOUND",
                "message": "No bank account found for this salon.",
            },
        )

    return account_data
