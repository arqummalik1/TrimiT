# Design Document — PayU Split Payments

## Overview

This design integrates the **PayU** payment gateway with **automatic split
settlements** into TrimiT. When a Customer pays online for a Booking, PayU
captures the money and automatically settles the salon's share to that salon's
PayU **vendor** account, while TrimiT retains a platform **commission**.

The design is built in **two independent layers** so the product can move
today, even though PayU split settlement is not yet activated:

- **Layer A — Collect & Store (works NOW, flag-independent).** Salon owners are
  onboarded one-by-one. Their bank + KYC details are validated and stored
  securely immediately. This requires no PayU activation and changes nothing in
  the live booking path.
- **Layer B — Charge & Split (gated, later).** PayU vendor registration, online
  payment, automatic split, webhooks, and refunds. Entirely behind the
  server-side feature flag `PAYU_PAYOUTS_ENABLED` (OFF by default) and only
  reachable once PayU split is activated.

The design is **additive and backwards-compatible**. No existing endpoint
contract, migration, auth flow, realtime subscription, or booking RPC is
modified.

### Current production reality (verified in code)

| Area | State today | Implication |
|---|---|---|
| `backend/routers/payments.py` | All endpoints return **501 / deactivated** | Online payments are already OFF in prod — safe to rebuild |
| `salon_bank_accounts` table | Referenced in service + tests but **has NO migration** | Table likely does not exist in prod → bank feature is broken |
| `bank_account_service.py` | Stores only `account_number_last4` | Unusable for payouts — must store full (encrypted) number |
| `database/47_salon_bank_details.sql` | Added bank cols to `public.salons` | Applied & frozen — left **deprecated-in-place**, unused |
| `salons.platform_fee_percentage` | Used by old split logic + tests | Reused as the commission source |

## Architecture

```
                         ┌─────────────────────────────────────────┐
                         │            Clients (live)                │
                         │  Mobile (Play Store)   Web (Vercel)      │
                         └───────────────┬─────────────────────────┘
                                         │ HTTPS (additive endpoints only)
                                         ▼
              ┌──────────────────────────────────────────────────────┐
              │                FastAPI backend (Render)               │
              │                                                        │
              │  LAYER A  (flag-independent, live now)                 │
              │  ── routers/bank_accounts.py  /owner/bank-accounts     │
              │       └─ services/bank_account_service.py              │
              │            └─ core/crypto.py (encrypt sensitive)       │
              │                                                        │
              │  LAYER B  (gated by PAYU_PAYOUTS_ENABLED)              │
              │  ── routers/payments.py   /payments/*                  │
              │       └─ services/payu_service.py (orders, hash,       │
              │            split, vendor reg, refund, webhook verify)  │
              │  ── core/feature_flags.py                              │
              └───────────────┬───────────────────────┬───────────────┘
                              │ service-role           │ HTTPS + SHA-512 hash
                              ▼                        ▼
                  ┌───────────────────────┐   ┌────────────────────────┐
                  │   Supabase (Postgres) │   │        PayU            │
                  │  salon_bank_accounts  │   │  Orders / Split /      │
                  │  payments / refunds   │   │  Vendors / Webhooks    │
                  │  payu_webhook_logs    │   │  (test mode → live)    │
                  │  idempotency_keys     │   └────────────────────────┘
                  └───────────────────────┘
```

### Layer separation rule

Layer A **never** calls PayU. It only validates and persists. Vendor status
stays `not_registered` until Layer B is enabled and a registration succeeds.
This is what lets onboarding start today.

## Components and Interfaces

### Layer A — Bank & KYC (live now)

**`services/bank_account_service.py`** (rewritten to use the real table and full
encrypted storage):

- `register_bank_account(salon_id, payload) -> BankAccountResponse`
  - Validates IFSC `^[A-Z]{4}0[A-Z0-9]{6}$` and PAN `^[A-Z]{5}[0-9]{4}[A-Z]$`.
  - Encrypts full account number, PAN, GSTIN via `core/crypto.py`.
  - Upserts one row per salon into `salon_bank_accounts`.
  - Returns a **masked** response (account `••••1234`, no full PAN/GSTIN).
- `get_bank_account(salon_id) -> BankAccountResponse | None` — masked.

**`routers/bank_accounts.py`** (`/owner/bank-accounts`, owner-only, unchanged
prefix so it stays backwards compatible):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/owner/bank-accounts` | Create/update bank + KYC (Layer A) |
| `GET` | `/owner/bank-accounts` | Fetch masked record + vendor status |

> Onboarding navigation (mobile/web) makes these fields **required** before an
> owner can finish setup, and shows a `Payouts: pending activation` badge until
> Layer B activates the vendor.

### Layer B — Payments (gated)

**`services/payu_service.py`** (new):

- `register_vendor(salon_bank_record) -> vendor_id, status`
- `create_order(booking, amount_paise, split) -> {payu_params, hash}`
- `verify_response_hash(payload) -> bool` (SHA-512)
- `verify_webhook(raw_body, signature) -> bool`
- `create_refund(payment, amount_paise, idem_key) -> refund`
- `compute_commission(amount_paise, rate) -> (commission_paise, vendor_paise)`
  reconciling exactly to the captured amount (no residual paise).

**Commission / fee model (per user decision):**

```
Customer pays  = amount_paise (100%)
TrimiT keeps   = commission = round_half_up(amount * commission_rate)   # default 5%
PayU keeps     = payu_fee   = gateway fee (~2%)                          # PayU MDR
Salon receives = amount − commission − payu_fee                         # ~93%
Disclosed to owner = "Total deduction ~7% (5% TrimiT + 2% gateway)"
Invariant: vendor_paise + commission + payu_fee == amount_paise (0 residual)
```

`commission_rate` default = 5, stored server-side, Admin-adjustable (no code
deploy). `payu_fee` comes from the active PayU configuration.

**`routers/payments.py`** (replaces the 501 stubs; every route checks the flag
first and returns a structured error when disabled):

| Method | Path | Purpose | Idempotent |
|---|---|---|---|
| `POST` | `/payments/create-order` | Create PayU order + split for a booking | ✅ |
| `POST` | `/payments/verify` | Verify callback hash, confirm booking | ✅ |
| `POST` | `/payments/webhook` | Server-to-server PayU events | dedupe by event id |
| `GET` | `/payments/status` | Payment status for a booking/order | n/a |
| `POST` | `/payments/refund` | Full/partial refund | ✅ |
| `GET` | `/owner/earnings` | Owner's payments + settlement status + net earnings | n/a |
| `GET`/`PUT` | `/admin/commission-rate` | Admin reads/sets the commission % | n/a |

**`core/feature_flags.py`** (new): reads `PAYU_PAYOUTS_ENABLED` from settings;
treats unset/unparseable as **disabled**.

### Configuration (additive to `config.py`)

```python
# Layer B gate — OFF by default. Live online payments only when true.
PAYU_PAYOUTS_ENABLED: bool = False
# PayU environment: "test" (sandbox) or "live". Independent of the flag.
PAYU_MODE: str = "test"
PAYU_MERCHANT_KEY: Optional[str] = None
PAYU_MERCHANT_SALT: Optional[str] = None
PAYU_TEST_MERCHANT_KEY: Optional[str] = None
PAYU_TEST_MERCHANT_SALT: Optional[str] = None
# AES key for encrypting bank/KYC sensitive fields at rest (Layer A).
FIELD_ENCRYPTION_KEY: Optional[str] = None
# Commission economics. Default 5% TrimiT take; PayU fee ~2% (salon nets ~93%).
PLATFORM_COMMISSION_PERCENT: float = 5.0   # Admin-adjustable override at runtime
PAYU_FEE_PERCENT: float = 2.0              # gateway fee disclosed in total deduction
```

> `PAYU_MODE` is independent of `PAYU_PAYOUTS_ENABLED`, so the team can verify
> the full flow in **test mode** without exposing online payments to live users.

## Data Models

### New migration — `database/48_salon_bank_accounts_payu.sql` (forward-only)

Creates the canonical table the code already expects, plus KYC + PayU columns.
No DROP/destructive ALTER. Migration 47's `salons` columns are left untouched.

```sql
CREATE TABLE IF NOT EXISTS public.salon_bank_accounts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id               UUID NOT NULL UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,

  -- Bank (sensitive fields stored encrypted; *_last4 / masked for display)
  account_name           TEXT NOT NULL,
  account_number_enc     TEXT NOT NULL,         -- AES-encrypted full number
  account_number_last4   TEXT NOT NULL,
  ifsc_code              TEXT NOT NULL,

  -- KYC
  pan_enc                TEXT NOT NULL,          -- AES-encrypted PAN
  pan_last4              TEXT,
  business_name          TEXT NOT NULL,
  contact_phone          TEXT NOT NULL,
  contact_email          TEXT NOT NULL,
  address_line           TEXT NOT NULL,
  pincode                TEXT NOT NULL,
  gstin_enc              TEXT,                   -- optional, encrypted

  -- PayU vendor lifecycle
  payu_vendor_id         TEXT,
  vendor_status          TEXT NOT NULL DEFAULT 'not_registered'
                          CHECK (vendor_status IN
                          ('not_registered','pending','active','rejected','suspended')),
  vendor_rejection_reason TEXT,

  -- Back-compat: keep the column the old tests referenced (nullable, unused)
  razorpay_linked_account_id TEXT,

  status                 TEXT NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Owner can read/write only their own salon's row; service-role (payouts) bypasses RLS.
CREATE POLICY "Owners manage own salon bank account"
  ON public.salon_bank_accounts FOR ALL
  USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
  WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));
```

Plus `payments`, `refunds`, and `payu_webhook_logs` tables (paise integers,
status enums per requirements, append-only webhook log with unique
`payu_event_id`). Money is always stored as **integer paise**.

The `payments` table records the full split breakdown and settlement state:

```sql
-- key columns on public.payments
amount_paise        INTEGER NOT NULL,        -- total customer paid
commission_paise    INTEGER NOT NULL,        -- TrimiT take (5% default)
payu_fee_paise      INTEGER NOT NULL,        -- gateway fee (~2%)
vendor_paise        INTEGER NOT NULL,        -- salon net (~93%)
payment_status      TEXT NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN
                     ('pending','paid','failed','refunded','partially_refunded')),
settlement_status   TEXT NOT NULL DEFAULT 'pending'
                     CHECK (settlement_status IN ('pending','settled','failed')),
-- CHECK: commission_paise + payu_fee_paise + vendor_paise = amount_paise
```

A lightweight `app_settings` row (or env override) holds the runtime
`commission_percent`, default 5, Admin-adjustable. PayU fee percent comes from
config.

> ⚠️ **Manual step:** after this file is created, the user must run
> `database/48_salon_bank_accounts_payu.sql` in the **Supabase SQL Editor**
> against the production project. It is forward-only and additive.

### Encryption (`core/crypto.py`, new)

- Symmetric AES (Fernet) using `FIELD_ENCRYPTION_KEY`.
- `encrypt(value) -> str`, `decrypt(token) -> str`.
- Only `account_number_enc`, `pan_enc`, `gstin_enc` are encrypted.
- API responses return masked values only; full values are decrypted **only**
  server-side at PayU vendor-registration time.

## PayU Integration Flows

### Vendor registration (Layer B, gated)

```
Owner saves bank+KYC ──▶ Layer A stores (vendor_status=not_registered)
        │  (flag ON?)
        ▼ yes
Backend ──register vendor──▶ PayU ──▶ vendor_id, status=pending
PayU later confirms ──webhook──▶ status=active   (eligible to receive split)
PayU rejects ──▶ status=rejected + reason (owner can resubmit)
```

### Payment + split

```
Customer taps Pay ──▶ POST /payments/create-order (Idempotency-Key)
  guard: flag ON, vendor_status=active, no existing paid payment
  ── compute commission + vendor split (sum == amount, 0 residual)
  ── create payment(pending) + PayU order(amount_paise) + SHA-512 hash + split config
  ◀─ payu_params returned to client → PayU checkout
PayU result ──callback──▶ POST /payments/verify  (verify hash)
              ──webhook──▶ POST /payments/webhook (verify hash, dedupe)
  on success: payment=paid → booking=confirmed (idempotent, server-authoritative)
  on failure: payment=failed → booking stays unconfirmed (retry up to 3)
```

### Refund

```
Cancellation/Admin ──▶ POST /payments/refund (Idempotency-Key)
  validate amount ≤ captured − prior refunds
  ── PayU refund ──▶ refund(initiated→processing→completed/failed)
  full → payment=refunded ; partial → payment=partially_refunded
```

## Error Handling

All errors return structured `{code, message}` (matching existing patterns):

| Code | When |
|---|---|
| `ONLINE_PAYMENT_DISABLED` | Flag off and online payment requested |
| `SALON_NOT_PAYOUT_READY` | `vendor_status != active` at order time |
| `BOOKING_ALREADY_PAID` | Booking already has a paid payment |
| `IDEMPOTENCY_KEY_REQUIRED` / `IDEMPOTENCY_CONFLICT` | Missing/conflicting key |
| `INVALID_IFSC` / `INVALID_PAN` | Layer A validation |
| `PAYU_HASH_INVALID` | Callback/webhook hash verification fails |
| `REFUND_AMOUNT_EXCEEDS` | Refund > remaining captured |
| `PAYMENT_RETRY_LIMIT` | >3 attempts on a booking |

Existing idempotency uses the `Idempotency-Key` header + `idempotency_keys`
table via `core/idempotency.py`; payment + refund endpoints reuse it with
`required=True`.

## Security & Compliance

- **No card data** ever touches TrimiT — PayU hosts capture.
- Sensitive fields **encrypted at rest**; **masked** in every response.
- **Append-only** `payu_webhook_logs` with unique `payu_event_id` (replay-safe).
- Secrets/PII excluded from logs.
- **RLS** restricts each owner to their own salon's bank row; service-role used
  only by server-side payout/registration code.
- All money in **integer paise**; commission rounds half-up; split reconciles
  exactly.

## Backwards Compatibility

- `/owner/bank-accounts` keeps its prefix and adds only optional fields →
  old builds unaffected.
- `/payments/*` replaces the current 501 stubs; while the flag is OFF it returns
  a clean structured `ONLINE_PAYMENT_DISABLED`, so any old client calling it
  degrades gracefully (same as today's "disabled" behavior).
- New table + columns via one new forward-only migration; migration 47 and all
  booking/auth/realtime/RPC behavior untouched.

## Testing Strategy

- **Layer A unit tests:** IFSC/PAN validation, encryption round-trip, masking,
  one-row-per-salon upsert, owner-only access.
- **Layer B (PayU test mode):** order creation + hash, split math reconciliation,
  callback/webhook hash verify + dedupe, refund full/partial, retry cap.
- **Flag-off regression:** `/payments/*` returns `ONLINE_PAYMENT_DISABLED`;
  booking/pay-at-salon flow byte-identical to today.
- Reuse existing `backend/tests/test_payments.py` harness (mock PayU client,
  mocked Supabase), updating it from Razorpay to PayU symbols.
- Verify deploy with `curl /health` and a flag-off sanity request before claiming
  live.

## Client UI (mobile + web, themed)

All new screens reuse the existing shared theme, typography, and components
(light + dark), and route through `repositories/` — no direct `axios`/`api.*`
in views, no `any` types, no raw error strings.

- **Owner onboarding — Payout Details:** required fields (account name, account
  number, IFSC, PAN, business name, phone, email, address, pincode; optional
  GSTIN) with inline IFSC/PAN validation. Shows the **Total deduction ~7%**
  breakdown (5% TrimiT + 2% gateway) and the net-per-transaction the salon
  receives. Required step before onboarding completes.
- **Owner dashboard — Payout status badge:** `Payouts: pending activation`
  until `vendor_status = active`.
- **Owner earnings view:** payment history with per-payment `Settlement_Status`
  (`pending` / `settled` / `failed`); a `paid` booking is never shown as money
  already in the bank.
- **Customer payment screen:** shows total payable in ₹ before redirect to PayU;
  skeleton loaders, structured error handling.

While `PAYU_PAYOUTS_ENABLED` is OFF, the customer payment entry point stays
hidden/disabled and the existing pay-at-salon flow is unchanged.

## Correctness Properties

These are invariants the implementation must always uphold. They map directly to
the acceptance criteria in `requirements.md`.

### Property 1: Flag-off is inert
While `PAYU_PAYOUTS_ENABLED` is disabled, no PayU call is ever made, no
`payments` row is created, and the booking / pay-at-salon / auth / realtime
flows behave byte-identically to pre-feature behavior.

**Validates: Requirements 4.4, 14.4**

### Property 2: Split reconciles exactly
For every captured payment, `vendor_paise + commission_paise + payu_fee_paise ==
captured_amount_paise` with zero residual, all integers. TrimiT keeps the
commission (default 5%), PayU keeps its fee (~2%), the salon nets the rest (~93%).

**Validates: Requirements 7.5**

### Property 3: Salon funds never land in TrimiT
The salon's portion is always routed to the salon's PayU vendor, never to a
TrimiT-owned account.

**Validates: Requirements 7.4**

### Property 4: No charge without an active vendor
An order is never created unless the salon's `vendor_status == active`;
otherwise the customer is not charged.

**Validates: Requirements 6.9, 7.5**

### Property 5: Booking confirms only on verified success
A booking moves to confirmed only after a hash-verified successful payment; an
invalid or absent hash mutates nothing.

**Validates: Requirements 8.1, 8.2, 8.4**

### Property 6: Idempotent mutations
Replays of payment-initiation, verify, and refund with the same
`Idempotency-Key` return the stored result without repeating the side effect;
key reuse across a different booking or amount is rejected.

**Validates: Requirements 6.4, 6.6, 6.7, 11.7, 13.6, 13.7**

### Property 7: Webhooks are replay-safe
A PayU event whose `payu_event_id` is already logged as processed is
acknowledged without re-mutating state.

**Validates: Requirements 10.4**

### Property 8: Sensitive data never leaks
Full account number, PAN, and GSTIN are encrypted at rest, never returned in any
API response, and never written to logs.

**Validates: Requirements 1.5, 1.6, 13.5**

### Property 9: One bank record per salon
At most one `salon_bank_accounts` row exists per `salon_id` (enforced by
`UNIQUE(salon_id)`); resubmission updates in place.

**Validates: Requirements 1.10**

### Property 10: Money is integer paise
No monetary value is ever stored or computed as a float.

**Validates: Requirements 13.2**

### Property 11: Tenancy is enforced
RLS guarantees an owner can read or write only their own salon's bank row;
cross-salon and cross-customer reads are denied.

**Validates: Requirements 2.4, 12.4**

### Property 12: Forward-only schema
All DB changes ship as one new numbered migration with no DROP, no destructive
ALTER, and no edit to migration 47.

**Validates: Requirements 14.3**
