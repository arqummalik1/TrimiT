"""Tests for POST /payments/verify (Task 13 — PayU callback + booking confirm).

Covers Req 8.1–8.6 and 16.1:
- flag OFF → ONLINE_PAYMENT_DISABLED (no PayU/DB contact)
- invalid/absent hash → 400 PAYU_HASH_INVALID, payment + booking UNCHANGED,
  a 'rejected' entry recorded in payu_webhook_logs (Req 8.4)
- payment not found → 404 PAYMENT_NOT_FOUND
- verified success → payment 'paid' + settlement 'pending' (Req 16.1) +
  booking 'confirmed' (Req 8.2, 8.3)
- verified failure → payment 'failed', booking NOT confirmed (Req 8.5)
- duplicate verify on an already-final payment → idempotent ack, no re-mutation
  (Req 8.6)

The feature flag and ``payu_service.verify_response_hash`` are monkeypatched;
Supabase is respx-mocked. Each test registers ONLY the Supabase routes it
expects to hit — an unexpected request to an unregistered route raises, which
itself proves a guard short-circuited (e.g. no payment PATCH on a rejected hash).

The verify endpoint is a PayU browser-redirect callback: it is NOT
user-authenticated (the response hash is the authentication), so no auth
override is needed.
"""

import json

import pytest
from fastapi import status
from httpx import Response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _enable_flag(monkeypatch):
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: True)


def _set_hash_valid(monkeypatch, valid: bool):
    monkeypatch.setattr(
        "routers.payments.payu_service.verify_response_hash", lambda posted: valid
    )


def _err_code(response) -> str:
    return response.json()["error"]["details"]["code"]


def _payment_get(mock_supabase, rows):
    return mock_supabase.get(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(200, json=rows)
    )


def _payment_patch(mock_supabase):
    return mock_supabase.patch(url__regex=r".*/rest/v1/payments\?.*").mock(
        return_value=Response(200, json=[{"id": "pay_1"}])
    )


def _booking_patch(mock_supabase):
    return mock_supabase.patch(url__regex=r".*/rest/v1/bookings\?.*").mock(
        return_value=Response(200, json=[{"id": "b1", "status": "confirmed"}])
    )


def _webhook_log_post(mock_supabase):
    return mock_supabase.post(url__regex=r".*/rest/v1/payu_webhook_logs.*").mock(
        return_value=Response(201, json=[{}])
    )


def _pending_payment(amount_paise=10000):
    return {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "pending",
        "settlement_status": "pending",
        "amount_paise": amount_paise,
    }


def _post_verify(client, posted):
    return client.post("/api/v1/payments/verify", json=posted)


# A representative PayU success callback body (amount matches the stored payment).
_SUCCESS_POSTED = {
    "status": "success",
    "txnid": "txn_abc",
    "amount": "100.00",
    "productinfo": "TrimiT booking b1",
    "firstname": "Cust One",
    "email": "cust1@example.com",
    "mihpayid": "payu_pay_1",
    "hash": "deadbeef",
    "udf1": "b1",
    "udf2": "pay_1",
}


# ---------------------------------------------------------------------------
# Flag gating
# ---------------------------------------------------------------------------


def test_verify_flag_off_disabled(client, monkeypatch):
    # Flag OFF — must short-circuit before any hash check or DB call. No
    # Supabase route registered: a DB call would hit an unmocked route and fail.
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: False)
    called = {"verify": False}
    monkeypatch.setattr(
        "routers.payments.payu_service.verify_response_hash",
        lambda posted: called.__setitem__("verify", True) or True,
    )

    resp = _post_verify(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert _err_code(resp) == "ONLINE_PAYMENT_DISABLED"
    assert called["verify"] is False


# ---------------------------------------------------------------------------
# Invalid / absent hash → 400, nothing mutated, audit 'rejected' logged
# ---------------------------------------------------------------------------


def test_invalid_hash_rejected_and_audited(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, False)
    audit = _webhook_log_post(mock_supabase)
    # No payment GET/PATCH or booking PATCH route is registered: if the handler
    # tried to look up or mutate anything it would hit an unmocked route and
    # fail — proving payment + booking are left UNCHANGED (Req 8.4).

    resp = _post_verify(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "PAYU_HASH_INVALID"

    # A 'rejected' audit entry was recorded, keyed by a txnid-derived event id,
    # and it contains NO hash / email / firstname (PII/secret-free).
    assert audit.called
    logged = json.loads(audit.calls.last.request.content)
    assert logged["outcome"] == "rejected"
    assert logged["event_type"] == "callback"
    assert "txn_abc" in logged["payu_event_id"]
    assert "hash" not in logged["raw_payload"]
    assert "email" not in logged["raw_payload"]
    assert "firstname" not in logged["raw_payload"]


def test_absent_hash_rejected(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    # Real verify_response_hash returns False when hash is absent; emulate that.
    _set_hash_valid(monkeypatch, False)
    _webhook_log_post(mock_supabase)

    posted = {k: v for k, v in _SUCCESS_POSTED.items() if k != "hash"}
    resp = _post_verify(client, posted)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "PAYU_HASH_INVALID"


# ---------------------------------------------------------------------------
# Payment lookup
# ---------------------------------------------------------------------------


def test_payment_not_found(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _payment_get(mock_supabase, [])

    resp = _post_verify(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert _err_code(resp) == "PAYMENT_NOT_FOUND"


# ---------------------------------------------------------------------------
# Verified success → paid + settlement pending + booking confirmed
# ---------------------------------------------------------------------------


def test_verified_success_confirms_booking(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _payment_get(mock_supabase, [_pending_payment()])
    payment_patch = _payment_patch(mock_supabase)
    booking_patch = _booking_patch(mock_supabase)
    _webhook_log_post(mock_supabase)

    resp = _post_verify(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "paid"
    assert body["settlement_status"] == "pending"  # Req 16.1
    assert body["booking_id"] == "b1"
    assert body["idempotent"] is False

    # Payment updated to paid + settlement pending (Req 8.2, 16.1).
    assert payment_patch.called
    patched = json.loads(payment_patch.calls.last.request.content)
    assert patched["payment_status"] == "paid"
    assert patched["settlement_status"] == "pending"
    assert patched["payu_payment_id"] == "payu_pay_1"

    # Booking confirmed (Req 8.3) — same column/value as bookings.py.
    assert booking_patch.called
    booking_body = json.loads(booking_patch.calls.last.request.content)
    assert booking_body["status"] == "confirmed"


# ---------------------------------------------------------------------------
# Verified failure → failed, booking NOT confirmed
# ---------------------------------------------------------------------------


def test_verified_failure_does_not_confirm_booking(
    client, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _payment_get(mock_supabase, [_pending_payment()])
    payment_patch = _payment_patch(mock_supabase)
    _webhook_log_post(mock_supabase)
    # No booking PATCH route registered: a booking update would hit an unmocked
    # route and fail — proving the booking is NOT confirmed (Req 8.5).

    posted = {**_SUCCESS_POSTED, "status": "failure"}
    resp = _post_verify(client, posted)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "failed"
    assert body["booking_status"] is None

    assert payment_patch.called
    patched = json.loads(payment_patch.calls.last.request.content)
    assert patched["payment_status"] == "failed"
    assert "settlement_status" not in patched


# ---------------------------------------------------------------------------
# Idempotent ack on an already-final payment → no re-mutation
# ---------------------------------------------------------------------------


def test_duplicate_verify_on_final_payment_is_idempotent(
    client, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    final_payment = {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "paid",
        "settlement_status": "pending",
        "amount_paise": 10000,
    }
    _payment_get(mock_supabase, [final_payment])
    # No PATCH (payment/booking) and no audit POST route registered: a re-mutation
    # would hit an unmocked route and fail — proving idempotency (Req 8.6).

    resp = _post_verify(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "paid"
    assert body["settlement_status"] == "pending"
    assert body["idempotent"] is True


def test_duplicate_verify_on_failed_payment_is_idempotent(
    client, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    failed_payment = {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "failed",
        "settlement_status": "pending",
        "amount_paise": 10000,
    }
    _payment_get(mock_supabase, [failed_payment])

    resp = _post_verify(client, {**_SUCCESS_POSTED, "status": "success"})

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "failed"
    assert body["idempotent"] is True


# ---------------------------------------------------------------------------
# Defensive amount tamper-check
# ---------------------------------------------------------------------------


def test_amount_mismatch_rejected(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    # Stored amount is 10000 paise (₹100) but PayU posts ₹50.00 → mismatch.
    _payment_get(mock_supabase, [_pending_payment(amount_paise=10000)])
    _webhook_log_post(mock_supabase)
    # No payment/booking PATCH registered → proves nothing is mutated.

    posted = {**_SUCCESS_POSTED, "amount": "50.00"}
    resp = _post_verify(client, posted)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "PAYU_AMOUNT_MISMATCH"
