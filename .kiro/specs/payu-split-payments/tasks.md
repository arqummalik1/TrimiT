# Implementation Plan

## Overview

Two phases. **Phase 1 (Layer A)** can ship today — it only collects and stores
bank/KYC securely and changes nothing live. **Phase 2 (Layer B)** is the PayU
charge/split path, built behind `PAYU_PAYOUTS_ENABLED` (OFF) and verified in
PayU test mode before any switch is flipped.

## Tasks

### Phase 1 — Layer A: Collect & Store (flag-independent, safe to ship now)

- [x] 1. Author the canonical database migration
  - Create `database/48_salon_bank_accounts_payu.sql` (forward-only, additive).
  - Create `salon_bank_accounts` with `UNIQUE(salon_id)`, encrypted columns
    (`account_number_enc`, `pan_enc`, `gstin_enc`), `*_last4`, KYC columns,
    `payu_vendor_id`, `vendor_status` enum (default `not_registered`),
    nullable `razorpay_linked_account_id` for back-compat.
  - Create `payments` (amount/commission/payu_fee/vendor paise, `payment_status`,
    `settlement_status`, CHECK that the three parts sum to amount), `refunds`,
    `payu_webhook_logs` (unique `payu_event_id`, append-only), and `app_settings`
    (holds `commission_percent`, default 5).
  - Add RLS policy so an owner reads/writes only their own salon's row.
  - Leave migration 47 untouched; do not DROP or destructively ALTER anything.
  - _Requirements: 1.1, 1.10, 13.2, 14.3, 2.4_

- [x] 2. Build field-encryption utility
  - Add `backend/core/crypto.py` with Fernet/AES `encrypt`/`decrypt` using
    `FIELD_ENCRYPTION_KEY` from settings.
  - Add `PLATFORM_COMMISSION_PERCENT`, `PAYU_FEE_PERCENT`, `FIELD_ENCRYPTION_KEY`,
    `PAYU_PAYOUTS_ENABLED`, `PAYU_MODE`, and PayU key/salt fields to `config.py`.
  - Unit test: encrypt→decrypt round-trip; ciphertext never equals plaintext.
  - _Requirements: 1.5, 13.5_

- [x] 3. Expand the bank/KYC model
  - In `backend/models/bank_accounts.py`, extend `BankAccountCreate` with PAN,
    business name, phone, email, address, pincode, optional GSTIN.
  - Update `BankAccountResponse` to expose masked account (`account_number_last4`),
    `vendor_status`, and exclude full PAN/GSTIN. No `any`/loose types.
  - _Requirements: 1.2, 1.3, 1.6_

- [x] 4. Rewrite the bank/KYC service to the canonical table
  - Rewrite `backend/services/bank_account_service.py` to read/write
    `salon_bank_accounts`, storing the FULL encrypted account number (not last4
    only), encrypting PAN/GSTIN, computing `*_last4`.
  - Validate IFSC `^[A-Z]{4}0[A-Z0-9]{6}$` and PAN `^[A-Z]{5}[0-9]{4}[A-Z]$`;
    return structured `{code,message}` on failure and keep prior record intact.
  - Upsert one row per salon.
  - _Requirements: 1.4, 1.7, 1.8, 1.9, 1.10_

- [x] 5. Harden the bank/KYC router
  - In `backend/routers/bank_accounts.py`, enforce owner-only access, operate
    only on the caller's own salon, return masked responses and structured errors.
  - Keep the `/owner/bank-accounts` prefix and contract additive (old clients
    unaffected).
  - _Requirements: 2.1, 2.2, 2.3, 14.1, 14.2_

- [x] 6. Backend tests for Layer A
  - Add `backend/tests/test_bank_accounts.py`: IFSC/PAN validation, encryption at
    rest + masking in responses, one-row-per-salon upsert, owner-only/tenancy
    rejection, missing-field structured errors.
  - _Requirements: 1.4, 1.6, 1.7, 1.8, 1.9, 2.2, 2.3_

- [x] 7. Owner onboarding "Payout Details" UI (mobile + web, themed)
  - Add a payout-details form using the shared theme/typography (light+dark),
    types in `mobile/src/types/`, calls through `repositories/` (no direct
    `api.*` in views, no `any`).
  - Required fields with inline IFSC/PAN validation; show the **~7% total
    deduction** breakdown (5% TrimiT + 2% gateway) and net-per-transaction.
  - Handle loading/error/success with skeletons and structured errors.
  - _Requirements: 7.7, 17.3, 17.5_

- [x] 8. Owner payout-status indicator
  - Add a `Payouts: pending activation` badge on the owner dashboard/onboarding
    wherever `vendor_status != active`.
  - _Requirements: 17.6, 3.5_

### Phase 2 — Layer B: Charge & Split (gated by PAYU_PAYOUTS_ENABLED, test mode first)

- [x] 9. Feature-flag + commission/fee calculation core
  - Add `backend/core/feature_flags.py` reading `PAYU_PAYOUTS_ENABLED` (unset →
    disabled).
  - Add a commission util: `compute_split(amount_paise, commission_percent,
    payu_fee_percent) -> (vendor, commission, payu_fee)` with half-up rounding and
    exact reconciliation (`vendor + commission + payu_fee == amount`, zero residual).
  - Read `commission_percent` from `app_settings` (default 5).
  - Unit tests across many amounts asserting reconciliation and integer paise.
  - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 7.4, 7.5, 15.5_

- [x] 10. PayU service (hash, env, order, vendor, refund, webhook verify)
  - Add `backend/services/payu_service.py`: SHA-512 request/response hashing,
    test/live endpoint + credential selection from `PAYU_MODE`, order creation
    with split config, vendor registration, refund creation, and webhook/callback
    hash verification.
  - Never log secrets or sensitive fields.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.3, 13.1, 13.5_

- [x] 11. Vendor registration flow
  - When flag ON and a complete bank/KYC record exists, register the salon as a
    PayU vendor → `vendor_status = pending`; handle PayU active/rejected/timeout
    transitions and store rejection reason; allow resubmission.
  - While flag OFF, store record without contacting PayU (`vendor_status` stays
    `not_registered`).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [x] 12. Rebuild `POST /payments/create-order`
  - Replace the 501 stub. Guard order: flag ON, `vendor_status = active`, no
    existing `paid` payment, ≤3 attempts. Require `Idempotency-Key`.
  - Derive amount server-side from the booking (ignore any client amount), build
    split, create `payment(pending)` + PayU order + hash, return PayU params.
  - Flag OFF → structured `ONLINE_PAYMENT_DISABLED`, no payment/PayU call.
  - _Requirements: 4.5, 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.8, 9.3, 9.4, 17.1, 17.2_

- [x] 13. `POST /payments/verify` (callback) + booking confirmation
  - Verify response hash; on success → `payment = paid`, `settlement_status =
    pending`, booking confirmed; on failure → `payment = failed`, booking
    untouched. Idempotent on repeat results.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 16.1_

- [x] 14. `POST /payments/webhook` (server-to-server)
  - Verify webhook hash, dedupe by `payu_event_id`, acknowledge ≤5s, log
    outcome (success/rejected/failed) append-only, confirm booking independently
    of the client callback, and update `settlement_status` to settled/failed on
    settlement events.
  - _Requirements: 8.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 16.2, 16.3_

- [x] 15. `GET /payments/status` and failure UX support
  - Return payment + settlement status scoped to the caller; support retry up to
    3 attempts with structured limit error.
  - _Requirements: 9.1, 9.2, 9.5, 12.1_

- [x] 16. `POST /payments/refund`
  - Require `Idempotency-Key`; validate amount ≤ captured − prior refunds;
    full → `refunded`, partial → `partially_refunded`; on PayU failure →
    `refund = failed`, payment status retained.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

- [x] 17. Admin commission-rate endpoint
  - Add `GET/PUT /admin/commission-rate` (admin-token guarded) writing
    `app_settings.commission_percent`; validate 0–100; applies to future
    payments only; not exposed to customers/owners.
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 18. Owner earnings + settlement view
  - Add `GET /owner/earnings` returning the owner's payments with
    `settlement_status` and net earnings; never present `paid` as settled.
  - _Requirements: 12.2, 16.4, 16.5_

- [x] 19. Customer payment UI (themed, flag-aware)
  - Add the payment screen via `repositories/`: show ₹ total before PayU
    redirect, skeletons, structured errors. Entry point hidden/disabled while the
    flag is OFF (pay-at-salon unchanged).
  - _Requirements: 4.4, 4.5, 17.4, 17.5_

- [x] 20. Migrate payment tests to PayU + flag-off regression
  - Update `backend/tests/test_payments.py` from Razorpay to PayU symbols; cover
    order+split reconciliation, hash verify, webhook dedupe, refund, retry cap,
    and a flag-OFF regression asserting `/payments/*` returns
    `ONLINE_PAYMENT_DISABLED` and the booking/pay-at-salon flow is unchanged.
  - _Requirements: 4.4, 6.6, 7.5, 8.6, 10.4, 11.2, 14.4, 14.5_

## Task Dependency Graph

```
Phase 1 (Layer A — ship now)
  1 (migration) ─┬─▶ 4 (service) ─▶ 5 (router) ─▶ 6 (tests)
  2 (crypto/config) ─┘                 │
  3 (model) ──────────────────────────┘
  5 ─▶ 7 (onboarding UI) ─▶ 8 (status badge)

Phase 2 (Layer B — gated)
  1, 2 ─▶ 9 (flag + split calc) ─▶ 10 (PayU service)
  10 ─┬─▶ 11 (vendor reg)
      ├─▶ 12 (create-order) ─▶ 13 (verify) ─▶ 14 (webhook)
      │                         └─▶ 15 (status)
      ├─▶ 16 (refund)
      └─▶ 17 (admin rate)
  13, 14 ─▶ 18 (owner earnings)
  12 ─▶ 19 (customer payment UI)
  all backend ─▶ 20 (tests + flag-off regression)
```

Critical path to ship Layer A today: **1 → 2 → 3 → 4 → 5 → 7**.
Phase 2 starts only after Phase 1 lands and PayU test credentials are available.

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3"], "parallel": true },
    { "wave": 2, "tasks": ["4"], "parallel": false },
    { "wave": 3, "tasks": ["5"], "parallel": false },
    { "wave": 4, "tasks": ["6", "7"], "parallel": true },
    { "wave": 5, "tasks": ["8"], "parallel": false },
    { "wave": 6, "tasks": ["9"], "parallel": false },
    { "wave": 7, "tasks": ["10"], "parallel": false },
    { "wave": 8, "tasks": ["11", "12", "16", "17"], "parallel": true },
    { "wave": 9, "tasks": ["13"], "parallel": false },
    { "wave": 10, "tasks": ["14", "15"], "parallel": true },
    { "wave": 11, "tasks": ["18", "19"], "parallel": true },
    { "wave": 12, "tasks": ["20"], "parallel": false }
  ]
}
```

## Notes

- **Manual step (you):** after task 1, run
  `database/48_salon_bank_accounts_payu.sql` in the Supabase SQL Editor against
  production. It is forward-only and additive.
- **Secrets:** PayU merchant key/salt and `FIELD_ENCRYPTION_KEY` are read from
  env — paste them into Render/local `.env`; never commit them.
- **Safety:** `PAYU_PAYOUTS_ENABLED` stays OFF until Phase 2 is fully tested in
  PayU test mode. Nothing in the live booking/auth/realtime path changes while it
  is OFF.
- **Backwards compatibility:** all changes are additive; existing endpoints,
  migration 47, and the booking RPC are untouched.
