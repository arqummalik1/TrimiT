-- ============================================================================
-- 48 — PayU split-payments: canonical bank/KYC storage + payment ledger
-- ----------------------------------------------------------------------------
-- Feature: payu-split-payments (Phase 1, Layer A storage + Layer B ledger).
--
-- This migration is FORWARD-ONLY and ADDITIVE. It contains:
--   • NO DROP
--   • NO destructive ALTER / rename / column removal
--   • NO edit to migration 47 (its salons bank columns are left in place)
--
-- It creates the canonical secure storage the application code expects:
--   1. public.salon_bank_accounts  — one Bank_KYC_Record per salon (encrypted)
--   2. public.payments             — online payment ledger (integer paise)
--   3. public.refunds              — refund records
--   4. public.payu_webhook_logs    — append-only PayU event audit log
--   5. public.app_settings         — runtime key/value config (commission_percent)
--
-- Money is ALWAYS stored as INTEGER paise. Sensitive fields (full account
-- number, PAN, GSTIN) are stored AES-encrypted by the application and are
-- masked/stripped from every API response.
--
-- Verified against existing schema (database/01_schema.sql):
--   • public.salons(id) PK, salons.owner_id UUID REFERENCES public.users(id)
--   • public.bookings(id) PK UUID
--   • gen_random_uuid() is available and already used by prior migrations
--   • No prior public.payments table exists (only subscription_payments) — safe
--
-- ⚠️ MANUAL STEP: run this file in the Supabase SQL Editor against the
--    production project. It is forward-only and additive.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. salon_bank_accounts — canonical Bank_KYC_Record (one row per salon)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_bank_accounts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id                    UUID NOT NULL UNIQUE
                                REFERENCES public.salons(id) ON DELETE CASCADE,

  -- Bank details (sensitive fields stored AES-encrypted; *_last4 for display)
  account_name                TEXT NOT NULL,
  account_number_enc          TEXT NOT NULL,   -- AES-encrypted full account number
  account_number_last4        TEXT NOT NULL,
  ifsc_code                   TEXT NOT NULL,

  -- KYC details
  pan_enc                     TEXT NOT NULL,   -- AES-encrypted full PAN
  pan_last4                   TEXT,
  business_name               TEXT NOT NULL,
  contact_phone               TEXT NOT NULL,
  contact_email               TEXT NOT NULL,
  address_line                TEXT NOT NULL,
  pincode                     TEXT NOT NULL,
  gstin_enc                   TEXT,            -- optional, AES-encrypted GSTIN

  -- PayU vendor lifecycle
  payu_vendor_id              TEXT,
  vendor_status               TEXT NOT NULL DEFAULT 'not_registered'
                                CHECK (vendor_status IN
                                ('not_registered','pending','active','rejected','suspended')),
  vendor_rejection_reason     TEXT,

  -- Back-compat: column referenced by existing tests (nullable, unused)
  razorpay_linked_account_id  TEXT,

  status                      TEXT NOT NULL DEFAULT 'active',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.salon_bank_accounts.account_number_enc IS
  'AES-encrypted full bank account number. Sensitive_Field: never returned in API responses (masked to last4) and never logged.';
COMMENT ON COLUMN public.salon_bank_accounts.pan_enc IS
  'AES-encrypted full PAN. Sensitive_Field: excluded from all API responses and logs.';
COMMENT ON COLUMN public.salon_bank_accounts.gstin_enc IS
  'AES-encrypted GSTIN (optional). Sensitive_Field: excluded from all API responses and logs.';
COMMENT ON COLUMN public.salon_bank_accounts.account_number_last4 IS
  'Last four digits of the bank account number, safe to display in masked responses.';

ALTER TABLE public.salon_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Owner can read/write only their own salon's row; service-role (payouts) bypasses RLS.
DROP POLICY IF EXISTS "Owners manage own salon bank account" ON public.salon_bank_accounts;
CREATE POLICY "Owners manage own salon bank account"
  ON public.salon_bank_accounts
  FOR ALL
  USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()))
  WITH CHECK (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. payments — online payment ledger (all money in INTEGER paise)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK references public.bookings(id) — verified as the bookings PK in 01_schema.sql.
  booking_id          UUID NOT NULL REFERENCES public.bookings(id),
  salon_id            UUID REFERENCES public.salons(id),
  user_id             UUID,

  -- Split breakdown, all integer paise. Invariant enforced by CHECK below.
  amount_paise        INTEGER NOT NULL,        -- total customer paid
  commission_paise    INTEGER NOT NULL DEFAULT 0,  -- TrimiT take (default 5%)
  payu_fee_paise      INTEGER NOT NULL DEFAULT 0,  -- gateway fee (~2%)
  vendor_paise        INTEGER NOT NULL DEFAULT 0,  -- salon net (~93%)
  currency            TEXT NOT NULL DEFAULT 'INR',

  payu_order_id       TEXT,
  payu_payment_id     TEXT,

  payment_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN
                        ('pending','paid','failed','refunded','partially_refunded')),
  settlement_status   TEXT NOT NULL DEFAULT 'pending'
                        CHECK (settlement_status IN ('pending','settled','failed')),

  attempt_count       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exact reconciliation: salon net + TrimiT commission + PayU fee == amount.
  -- Meaningful once the split is computed; defaults (0,0,0,0) satisfy it for a
  -- freshly created pending row before amounts are set.
  CONSTRAINT payments_split_reconciles
    CHECK (commission_paise + payu_fee_paise + vendor_paise = amount_paise)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_salon_id   ON public.payments (salon_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON public.payments (user_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Customer reads their own payments.
DROP POLICY IF EXISTS "Customers read own payments" ON public.payments;
CREATE POLICY "Customers read own payments"
  ON public.payments
  FOR SELECT
  USING (user_id = auth.uid());

-- Owner reads payments for salons they own.
DROP POLICY IF EXISTS "Owners read own salon payments" ON public.payments;
CREATE POLICY "Owners read own salon payments"
  ON public.payments
  FOR SELECT
  USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));
-- NOTE: webhook/settlement processing writes via service-role, which bypasses RLS.

-- ----------------------------------------------------------------------------
-- 3. refunds — full/partial refund records (integer paise)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES public.payments(id),
  amount_paise    INTEGER NOT NULL,
  payu_refund_id  TEXT,
  refund_status   TEXT NOT NULL DEFAULT 'initiated'
                    CHECK (refund_status IN ('initiated','processing','completed','failed')),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds (payment_id);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
-- Refunds are managed by server-side payout processing (service-role bypasses RLS).
-- No permissive policy: non-service-role access is denied by default.

-- ----------------------------------------------------------------------------
-- 4. payu_webhook_logs — append-only PayU event audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payu_webhook_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payu_event_id  TEXT UNIQUE NOT NULL,
  event_type     TEXT,
  outcome        TEXT CHECK (outcome IN ('success','rejected','failed')),
  raw_payload    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payu_webhook_logs ENABLE ROW LEVEL SECURITY;
-- Append-only audit log written by service-role webhook processing only.
-- No permissive policy: non-service-role access is denied by default.

-- ----------------------------------------------------------------------------
-- 5. app_settings — runtime key/value config (e.g. commission_percent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Read/written by server-side config (service-role bypasses RLS).
-- No permissive policy: non-service-role access is denied by default.

-- Seed the default commission rate (5%). Idempotent — never overwrites an
-- Admin-set value on re-run.
INSERT INTO public.app_settings (key, value)
VALUES ('commission_percent', '5')
ON CONFLICT (key) DO NOTHING;

SELECT '✅ 48 — PayU split-payments: salon_bank_accounts, payments, refunds, payu_webhook_logs, app_settings created' AS status;
