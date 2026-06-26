"""Layer A — owner-facing earnings + settlement view (`/owner/earnings`).

Owner-only, single-tenant, READ-ONLY endpoint that lists the calling owner's
salon Payments with their ``settlement_status`` and a net-earnings summary
(Req 12.2, 16.4, 16.5).

Design decisions (documented per task):
- **Access control** reuses the exact pattern from ``bank_accounts.py``:
  owner-only (``_require_owner``) and tenancy resolved server-side from
  ``salons.owner_id`` via the service role (``_resolve_owned_salon_id``). The
  client can never supply or spoof a ``salon_id`` (Req 12.2).
- **Owner with no salon** → returns an empty list with a zeroed summary and HTTP
  200 (NOT a 403). Owners onboarding pre-launch can open this view and simply
  see nothing yet, mirroring the flag-off posture below.
- **NOT gated by the ``PAYU_PAYOUTS_ENABLED`` feature flag.** This is a
  read-only reporting view. While the flag is off no Payments exist, so an owner
  just sees an empty list — there is no payout behavior to gate here.
- **Settlement honesty (Req 16.4):** a ``paid`` Payment is never presented as
  money already in the salon's bank. The summary separates
  ``total_settled_paise`` (``settlement_status == 'settled'`` only) from
  ``total_pending_settlement_paise`` (earned but ``settlement_status ==
  'pending'``). Per-item ``settlement_status`` is always returned verbatim.
- **Summary scope:** aggregates are computed over the same page of rows returned
  by this request (newest first, bounded by ``limit``). The default ``limit`` of
  100 covers the full history for any real salon today; ``limit``/``offset`` are
  validated query params.

No Sensitive_Field or PII is logged.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies.auth import get_current_user
from core.supabase import supabase
from models.payments import OwnerEarningItem, OwnerEarningsResponse, OwnerEarningsSummary

logger = logging.getLogger("trimit")

router = APIRouter(prefix="/owner/earnings", tags=["Owner Earnings"])

# payment_status values that represent money the salon has actually earned
# (the customer paid and was not fully refunded). A fully ``refunded`` payment
# is excluded; ``partially_refunded`` still leaves a captured remainder owed.
_EARNED_STATUSES = ("paid", "partially_refunded")

# Columns selected from the payments ledger. Only non-sensitive reporting fields.
_SELECT = (
    "id,booking_id,amount_paise,commission_paise,payu_fee_paise,"
    "vendor_paise,payment_status,settlement_status,created_at"
)


def _require_owner(current_user: dict) -> None:
    """Reject any caller whose role is not ``owner`` (Req 12.2 tenancy gate).

    Raises a structured 403 and exposes no earnings data.
    """
    profile = current_user.get("profile") or {}
    if profile.get("role") != "owner":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "FORBIDDEN_NOT_OWNER",
                "message": "Only salon owners can view earnings.",
            },
        )


async def _resolve_owned_salon_id(current_user: dict) -> Optional[UUID]:
    """Return the salon_id the caller owns, or ``None`` if they own no salon.

    Resolves tenancy server-side from ``salons.owner_id`` using the service role
    so an owner can only ever read their own salon's payments (Req 12.2). The
    client cannot supply or spoof a salon_id.
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


def _build_summary(items: List[OwnerEarningItem]) -> OwnerEarningsSummary:
    """Aggregate net earnings while keeping settled vs pending explicit.

    - ``total_earned_paise``: salon net for earned payments (Req 16.5 basis).
    - ``total_settled_paise``: salon net actually transferred (settlement_status
      ``settled``) — money truly in the bank (Req 16.4).
    - ``total_pending_settlement_paise``: salon net earned but still awaiting
      transfer (settlement_status ``pending``). A ``paid`` payment lives here,
      never in ``total_settled_paise`` (Req 16.4).
    """
    total_earned = 0
    total_settled = 0
    total_pending = 0
    for item in items:
        is_earned = item.payment_status in _EARNED_STATUSES
        if is_earned:
            total_earned += item.vendor_paise
        if item.settlement_status == "settled":
            total_settled += item.vendor_paise
        if is_earned and item.settlement_status == "pending":
            total_pending += item.vendor_paise
    return OwnerEarningsSummary(
        total_earned_paise=total_earned,
        total_settled_paise=total_settled,
        total_pending_settlement_paise=total_pending,
    )


@router.get("", response_model=OwnerEarningsResponse)
async def get_owner_earnings(
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List the calling owner's payments with settlement status + net earnings.

    Owner-only (Req 12.2). Scoped to the caller's own salon, resolved server-side.
    Read-only and not gated by the feature flag. A ``paid`` payment is reported
    with its real ``settlement_status`` and is never counted as settled money
    (Req 16.4, 16.5).
    """
    _require_owner(current_user)

    salon_id = await _resolve_owned_salon_id(current_user)
    if not salon_id:
        # Owner role but owns no salon yet — return an empty, zeroed view (200)
        # rather than an error so pre-launch onboarding can open this screen.
        return OwnerEarningsResponse(items=[], summary=_build_summary([]))

    try:
        resp = await supabase.request(
            "GET",
            (
                f"rest/v1/payments?salon_id=eq.{salon_id}"
                f"&select={_SELECT}"
                f"&order=created_at.desc&limit={limit}&offset={offset}"
            ),
            service_role=True,
        )
    except Exception as e:
        # Never include row data or identifiers in the log line.
        logger.error("[OwnerEarnings] Supabase request failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "EARNINGS_READ_FAILED",
                "message": "Failed to load earnings.",
            },
        )

    if resp.status_code != 200:
        logger.error("[OwnerEarnings] Unexpected payments status: %s", resp.status_code)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "EARNINGS_READ_FAILED",
                "message": "Failed to load earnings.",
            },
        )

    rows = resp.json() or []
    items = [
        OwnerEarningItem(
            payment_id=row["id"],
            booking_id=row["booking_id"],
            amount_paise=row["amount_paise"],
            commission_paise=row["commission_paise"],
            payu_fee_paise=row["payu_fee_paise"],
            vendor_paise=row["vendor_paise"],
            payment_status=row["payment_status"],
            settlement_status=row["settlement_status"],
            created_at=row["created_at"],
        )
        for row in rows
    ]

    return OwnerEarningsResponse(items=items, summary=_build_summary(items))
