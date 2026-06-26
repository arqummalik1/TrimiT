"""Tests for Task 9 — feature flag + commission/fee split math.

Covers:
- ``core.feature_flags.payu_payouts_enabled`` fail-closed behavior.
- ``services.commission.compute_split`` reconciliation (Correctness Property 2,
  Requirement 7.5), half-up rounding (Requirement 7.2), and validation
  (Requirement 6.2 amount bounds).
- ``services.commission.get_commission_percent`` reading ``app_settings`` with
  a safe fallback (Requirements 15.1, 15.5).

All Supabase REST traffic is intercepted by respx (see ``mock_supabase`` in
conftest) — no real network.

Validates: Requirements 4.1, 4.2, 4.3, 7.2, 7.5, 15.1, 15.5.
"""

import pytest
from httpx import Response

from core import feature_flags
from core.supabase import supabase
from services import commission
from services.commission import compute_split, get_commission_percent

# Default economics under test: 5% TrimiT commission, 2% PayU fee.
COMMISSION_PCT = 5.0
PAYU_FEE_PCT = 2.0


# ---------------------------------------------------------------------------
# 1. compute_split — reconciliation always holds, all parts int >= 0
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "amount_paise",
    [1, 99, 100, 199, 12345, 99999, 100000, 1_000_000, 9_999_999_999],
)
def test_split_reconciles_and_is_nonnegative_ints(amount_paise):
    result = compute_split(amount_paise, COMMISSION_PCT, PAYU_FEE_PCT)

    # Every part is an int >= 0.
    for key in ("amount_paise", "commission_paise", "payu_fee_paise", "vendor_paise"):
        assert isinstance(result[key], int)
        assert result[key] >= 0

    # Property 2: exact reconciliation, zero residual.
    assert (
        result["commission_paise"]
        + result["payu_fee_paise"]
        + result["vendor_paise"]
        == amount_paise
    )
    assert result["amount_paise"] == amount_paise


# ---------------------------------------------------------------------------
# 2. Hand-verified rounding cases (half-up, NOT banker's rounding)
# ---------------------------------------------------------------------------


def test_hand_case_amount_100():
    # 100 * 5% = 5.0 → 5 ; 100 * 2% = 2.0 → 2 ; vendor = 93.
    result = compute_split(100, COMMISSION_PCT, PAYU_FEE_PCT)
    assert result["commission_paise"] == 5
    assert result["payu_fee_paise"] == 2
    assert result["vendor_paise"] == 93


def test_hand_case_amount_199_rounds_half_up():
    # 199 * 5% = 9.95 → 10 (half-up) ; 199 * 2% = 3.98 → 4 ; vendor = 185.
    result = compute_split(199, COMMISSION_PCT, PAYU_FEE_PCT)
    assert result["commission_paise"] == 10
    assert result["payu_fee_paise"] == 4
    assert result["vendor_paise"] == 185


# ---------------------------------------------------------------------------
# 3. compute_split — validation (Req 6.2 amount bounds, percent >= 0)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("bad_amount", [0, -1, -100])
def test_amount_at_or_below_zero_raises(bad_amount):
    with pytest.raises(ValueError):
        compute_split(bad_amount, COMMISSION_PCT, PAYU_FEE_PCT)


def test_amount_above_max_raises():
    with pytest.raises(ValueError):
        compute_split(10_000_000_000, COMMISSION_PCT, PAYU_FEE_PCT)


def test_non_int_amount_raises():
    with pytest.raises(ValueError):
        compute_split(100.5, COMMISSION_PCT, PAYU_FEE_PCT)  # type: ignore[arg-type]


def test_negative_percent_raises():
    with pytest.raises(ValueError):
        compute_split(100, -1.0, PAYU_FEE_PCT)


def test_absurd_percents_make_vendor_negative_raises():
    # 60% + 50% = 110% > 100% → vendor would be negative.
    with pytest.raises(ValueError):
        compute_split(100, 60.0, 50.0)


# ---------------------------------------------------------------------------
# 4. feature_flags.payu_payouts_enabled — fail-closed (Req 4.1, 4.2, 4.3)
# ---------------------------------------------------------------------------


def test_flag_true(monkeypatch):
    monkeypatch.setattr(feature_flags.settings, "PAYU_PAYOUTS_ENABLED", True)
    assert feature_flags.payu_payouts_enabled() is True


def test_flag_false(monkeypatch):
    monkeypatch.setattr(feature_flags.settings, "PAYU_PAYOUTS_ENABLED", False)
    assert feature_flags.payu_payouts_enabled() is False


def test_flag_none_fails_closed(monkeypatch):
    monkeypatch.setattr(feature_flags.settings, "PAYU_PAYOUTS_ENABLED", None)
    assert feature_flags.payu_payouts_enabled() is False


# ---------------------------------------------------------------------------
# 5. get_commission_percent — reads app_settings, safe fallback (Req 15.1, 15.5)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_commission_percent_reads_app_settings(mock_supabase):
    # Fresh httpx client bound to this test's event loop.
    supabase._client = None
    try:
        mock_supabase.get("/rest/v1/app_settings").mock(
            return_value=Response(200, json=[{"value": "7"}])
        )
        assert await get_commission_percent() == 7.0
    finally:
        supabase._client = None


@pytest.mark.asyncio
async def test_get_commission_percent_falls_back_when_empty(mock_supabase, monkeypatch):
    monkeypatch.setattr(commission.settings, "PLATFORM_COMMISSION_PERCENT", 5.0)
    supabase._client = None
    try:
        mock_supabase.get("/rest/v1/app_settings").mock(
            return_value=Response(200, json=[])
        )
        assert await get_commission_percent() == 5.0
    finally:
        supabase._client = None


@pytest.mark.asyncio
async def test_get_commission_percent_falls_back_on_error(mock_supabase, monkeypatch):
    monkeypatch.setattr(commission.settings, "PLATFORM_COMMISSION_PERCENT", 5.0)
    supabase._client = None
    try:
        mock_supabase.get("/rest/v1/app_settings").mock(
            return_value=Response(500, json={"error": "boom"})
        )
        assert await get_commission_percent() == 5.0
    finally:
        supabase._client = None
