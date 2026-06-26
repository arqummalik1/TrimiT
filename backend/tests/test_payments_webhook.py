"""Tests for POST /payments/webhook (Task 14 — PayU server-to-server events).

Covers Req 8.7, 10.1–10.6, 16.2, 16.3:
- flag OFF → 200 {"status":"ignored"}, NO processing (no PayU/DB contact)
- invalid/absent hash → 400 PAYU_HASH_INVALID, NOTHING mutated, a 'rejected'
  audit entry recorded (Req 10.2)
- duplicate event (claim insert returns 409) → 200 ack, NO payment/booking
  mutation (Req 10.4)
- fresh success → payment 'paid' + settlement 'pending' + booking 'confirmed',
  independently of the browser callback (Req 8.7, 16.1)
- fresh failure → payment 'failed', booking NOT confirmed (Req 8.5)
- settlement-completed event → settlement_status 'settled' (Req 16.2)

The feature flag and ``payu_service.verify_webhook`` are monkeypatched; Supabase
is respx-mocked. Each test registers ONLY the Supabase routes it expects to hit
— an unexpected request to an unregistered route raises, which itself proves a
guard short-circuited (e.g. no payment PATCH on a rejected hash, or on a
duplicate event).

The webhook is a PayU server-to-server call: it is NOT user-authenticated (the
webhook hash is the authentication), so no auth override is needed.
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
        "routers.payments.payu_service.verify_webhook", lambda posted: valid
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


def _webhook_log_post(mock_supabase, status_code=201):
    """Mock the claim/audit INSERT into payu_webhook_logs.

    status_code 201 → fresh claim; 409 → duplicate event id (Req 10.4).
    """
    return mock_supabase.post(url__regex=r".*/rest/v1/payu_webhook_logs.*").mock(
        return_value=Response(status_code, json=[{}] if status_code < 300 else {})
    )


def _webhook_log_patch(mock_supabase):
    return mock_supabase.patch(url__regex=r".*/rest/v1/payu_webhook_logs.*").mock(
        return_value=Response(200, json=[{}])
    )


def _webhook_log_delete(mock_supabase):
    return mock_supabase.delete(url__regex=r".*/rest/v1/payu_webhook_logs.*").mock(
        return_value=Response(200, json=[{}])
    )


def _pending_payment(amount_paise=10000):
    return {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "pending",
        "settlement_status": "pending",
        "amount_paise": amount_paise,
    }


def _post_webhook(client, posted):
    return client.post("/api/v1/payments/webhook", json=posted)


# A representative PayU success webhook body.
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
# Flag gating (Req 4.x) — ignored ack, no processing
# ---------------------------------------------------------------------------


def test_webhook_flag_off_ignored(client, monkeypatch):
    # Flag OFF — must ack with {"status":"ignored"} and NOT verify or touch DB.
    monkeypatch.setattr("routers.payments.payu_payouts_enabled", lambda: False)
    called = {"verify": False}
    monkeypatch.setattr(
        "routers.payments.payu_service.verify_webhook",
        lambda posted: called.__setitem__("verify", True) or True,
    )

    resp = _post_webhook(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"status": "ignored"}
    assert called["verify"] is False


# ---------------------------------------------------------------------------
# Invalid / absent hash → 400, nothing mutated, audit 'rejected' (Req 10.2)
# ---------------------------------------------------------------------------


def test_invalid_hash_rejected_and_audited(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, False)
    audit = _webhook_log_post(mock_supabase, status_code=201)
    # No payment GET/PATCH or booking PATCH route registered: any lookup/mutate
    # would hit an unmocked route and fail — proving NOTHING is mutated.

    resp = _post_webhook(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "PAYU_HASH_INVALID"

    # A 'rejected' audit entry was recorded, keyed by an event id, with NO
    # hash / email / firstname (PII/secret-free).
    assert audit.called
    logged = json.loads(audit.calls.last.request.content)
    assert logged["outcome"] == "rejected"
    assert logged["event_type"] == "webhook"
    assert "txn_abc" in logged["payu_event_id"] or "payu_pay_1" in logged["payu_event_id"]
    assert "hash" not in logged["raw_payload"]
    assert "email" not in logged["raw_payload"]
    assert "firstname" not in logged["raw_payload"]


def test_absent_hash_rejected(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, False)
    _webhook_log_post(mock_supabase, status_code=201)

    posted = {k: v for k, v in _SUCCESS_POSTED.items() if k != "hash"}
    resp = _post_webhook(client, posted)

    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert _err_code(resp) == "PAYU_HASH_INVALID"


# ---------------------------------------------------------------------------
# Duplicate event (claim insert 409) → ack, no mutation (Req 10.4)
# ---------------------------------------------------------------------------


def test_duplicate_event_acknowledged_without_reprocessing(
    client, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    # Claim insert collides on the unique payu_event_id → 409.
    _webhook_log_post(mock_supabase, status_code=409)
    # No payment GET/PATCH or booking PATCH registered: a duplicate must NOT
    # reprocess or mutate any state (Req 10.4) — a DB call would fail here.

    resp = _post_webhook(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["status"] == "ok"
    assert body["duplicate"] is True


# ---------------------------------------------------------------------------
# Fresh success → paid + settlement pending + booking confirmed (Req 8.7, 16.1)
# ---------------------------------------------------------------------------


def test_fresh_success_confirms_booking_independently(
    client, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    claim = _webhook_log_post(mock_supabase, status_code=201)
    _webhook_log_patch(mock_supabase)
    _payment_get(mock_supabase, [_pending_payment()])
    payment_patch = _payment_patch(mock_supabase)
    booking_patch = _booking_patch(mock_supabase)

    resp = _post_webhook(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "paid"
    assert body["settlement_status"] == "pending"  # Req 16.1
    assert body["booking_status"] == "confirmed"

    # Event was claimed (insert-first dedupe) then processed.
    assert claim.called

    # Payment updated to paid + settlement pending (Req 8.7 authoritative path).
    assert payment_patch.called
    patched = json.loads(payment_patch.calls.last.request.content)
    assert patched["payment_status"] == "paid"
    assert patched["settlement_status"] == "pending"
    assert patched["payu_payment_id"] == "payu_pay_1"

    # Booking confirmed (Req 8.7) — same column/value as bookings.py.
    assert booking_patch.called
    booking_body = json.loads(booking_patch.calls.last.request.content)
    assert booking_body["status"] == "confirmed"


# ---------------------------------------------------------------------------
# Fresh failure → failed, booking NOT confirmed (Req 8.5)
# ---------------------------------------------------------------------------


def test_fresh_failure_does_not_confirm_booking(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _webhook_log_post(mock_supabase, status_code=201)
    _webhook_log_patch(mock_supabase)
    _payment_get(mock_supabase, [_pending_payment()])
    payment_patch = _payment_patch(mock_supabase)
    # No booking PATCH route registered: a booking update would fail — proving
    # the booking is NOT confirmed on failure (Req 8.5).

    posted = {**_SUCCESS_POSTED, "status": "failure"}
    resp = _post_webhook(client, posted)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "failed"
    assert body["booking_status"] is None

    assert payment_patch.called
    patched = json.loads(payment_patch.calls.last.request.content)
    assert patched["payment_status"] == "failed"
    assert "settlement_status" not in patched


# ---------------------------------------------------------------------------
# Already-final payment via a fresh event → idempotent, no re-mutation (Req 8.6)
# ---------------------------------------------------------------------------


def test_fresh_event_on_already_paid_payment_is_idempotent(
    client, mock_supabase, monkeypatch
):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _webhook_log_post(mock_supabase, status_code=201)
    _webhook_log_patch(mock_supabase)
    final_payment = {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "paid",
        "settlement_status": "pending",
        "amount_paise": 10000,
    }
    _payment_get(mock_supabase, [final_payment])
    # No payment/booking PATCH registered: an already-final payment must not be
    # re-mutated (Req 8.6) — the verify callback may already have confirmed it.

    resp = _post_webhook(client, _SUCCESS_POSTED)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["payment_status"] == "paid"
    assert body["idempotent"] is True


# ---------------------------------------------------------------------------
# Settlement-completed event → settlement_status settled (Req 16.2)
# ---------------------------------------------------------------------------


def test_settlement_completed_marks_settled(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _webhook_log_post(mock_supabase, status_code=201)
    _webhook_log_patch(mock_supabase)
    # Payment is already paid; the settlement notification only moves
    # settlement_status pending → settled.
    paid_payment = {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "paid",
        "settlement_status": "pending",
        "amount_paise": 10000,
    }
    _payment_get(mock_supabase, [paid_payment])
    payment_patch = _payment_patch(mock_supabase)
    # No booking PATCH registered: a settlement event must not touch the booking.

    posted = {
        "txnid": "txn_abc",
        "mihpayid": "payu_pay_1",
        "settlement_status": "settled",
        "hash": "deadbeef",
    }
    resp = _post_webhook(client, posted)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["settlement_status"] == "settled"  # Req 16.2

    assert payment_patch.called
    patched = json.loads(payment_patch.calls.last.request.content)
    assert patched["settlement_status"] == "settled"
    assert "payment_status" not in patched


# ---------------------------------------------------------------------------
# Settlement-failed event → settlement_status failed (Req 16.3)
# ---------------------------------------------------------------------------


def test_settlement_failed_marks_failed(client, mock_supabase, monkeypatch):
    _enable_flag(monkeypatch)
    _set_hash_valid(monkeypatch, True)
    _webhook_log_post(mock_supabase, status_code=201)
    _webhook_log_patch(mock_supabase)
    paid_payment = {
        "id": "pay_1",
        "booking_id": "b1",
        "payment_status": "paid",
        "settlement_status": "pending",
        "amount_paise": 10000,
    }
    _payment_get(mock_supabase, [paid_payment])
    payment_patch = _payment_patch(mock_supabase)

    posted = {
        "txnid": "txn_abc",
        "mihpayid": "payu_pay_1",
        "settlement_status": "failed",
        "hash": "deadbeef",
    }
    resp = _post_webhook(client, posted)

    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["settlement_status"] == "failed"  # Req 16.3

    assert payment_patch.called
    patched = json.loads(payment_patch.calls.last.request.content)
    assert patched["settlement_status"] == "failed"
