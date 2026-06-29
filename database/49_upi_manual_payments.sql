-- ============================================================================
-- 49 — UPI-intent + manual-verification payments (replaces PayU split-payments)
-- ----------------------------------------------------------------------------
-- Product model (v1): TrimiT never collects customer money. The customer pays
-- the salon's UPI ID directly via a UPI app, and the salon owner MANUALLY
-- verifies the payment in the app. A booking is CONFIRMED only after the owner
-- verifies. Only two payment methods exist: 'salon_cash' and 'upi'.
--
-- This migration is FORWARD-ONLY and ADDITIVE:
--   • NO destructive DROP of any table or data.
--   • Only widens two CHECK constraints (status, payment_method) and adds
--     columns/indexes/functions. Existing rows keep working.
--
-- Architecture decision (confirmed with product): booking lifecycle stays in
-- bookings.status; the payment verification workflow lives in a SEPARATE
-- bookings.payment_verification_status column, so the booking engine remains
-- independent of the payment implementation.
--
-- The PayU tables from migration 48 (salon_bank_accounts, payments, refunds,
-- payu_webhook_logs, app_settings) are LEFT IN PLACE untouched — history is
-- preserved. They are simply no longer read or written by the application.
--
-- ⚠️ MANUAL STEP: run this file in the Supabase SQL Editor against the
--    production project. It is forward-only and additive.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. salons — UPI onboarding fields (customer needs upi_id to pay the salon)
-- ----------------------------------------------------------------------------
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS upi_id              TEXT;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS upi_qr_code         TEXT;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS bank_name           TEXT;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

COMMENT ON COLUMN public.salons.upi_id IS
  'Salon UPI VPA (e.g. glowsalon@okaxis). Returned to customers so they can pay the salon directly. Not a secret.';
COMMENT ON COLUMN public.salons.upi_qr_code IS
  'Optional URL/text of the salon UPI QR code image.';

-- ----------------------------------------------------------------------------
-- 2. bookings — payment verification workflow (separate from booking status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_reference  TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expected_upi_id    TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS verified_by        UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS verification_notes TEXT;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_verification_status TEXT NOT NULL DEFAULT 'not_required';

COMMENT ON COLUMN public.bookings.booking_reference IS
  'Unique human-readable reference (e.g. TRM-2026-7F3A91) attached to a UPI payment so the salon can identify the incoming transfer.';
COMMENT ON COLUMN public.bookings.payment_verification_status IS
  'UPI payment workflow, independent of booking status: not_required | initiated | waiting_verification | verified | rejected | timeout.';

-- Widen the payment_verification_status to its allowed set (drop any prior
-- CHECK on the column first so re-runs are safe).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'bookings'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%payment_verification_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_verification_status_check
  CHECK (payment_verification_status IN
    ('not_required','initiated','waiting_verification','verified','rejected','timeout'));

-- One booking_reference is unique when present (NULL allowed for cash bookings).
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_booking_reference
  ON public.bookings (booking_reference)
  WHERE booking_reference IS NOT NULL;

-- Helps the timeout scheduler scan only UPI bookings awaiting verification.
CREATE INDEX IF NOT EXISTS idx_bookings_payment_verification
  ON public.bookings (payment_verification_status)
  WHERE payment_verification_status IN ('initiated','waiting_verification');

-- ----------------------------------------------------------------------------
-- 3. Widen bookings.status CHECK to add 'in_service' and 'no_show'
-- ----------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'bookings'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%status%'
       AND pg_get_constraintdef(con.oid) NOT ILIKE '%payment%'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN
    ('pending','confirmed','in_service','completed','cancelled','no_show'));

-- ----------------------------------------------------------------------------
-- 4. Widen bookings.payment_method CHECK to add 'upi' (keep legacy values)
-- ----------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'bookings'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%payment_method%'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('salon_cash','online','upi'));

-- ----------------------------------------------------------------------------
-- 5. Timeout scheduler — flip stale UPI verifications to 'timeout'
-- ----------------------------------------------------------------------------
-- Reuses the same pattern as migration 33/37. Unlike the old online-pay expiry,
-- this NEVER cancels the booking: the salon may still verify later (product
-- rule). It only moves an unverified UPI payment to 'timeout' so the customer
-- UI can show the "not yet verified — wait / contact / cancel" state.
CREATE OR REPLACE FUNCTION public.expire_unverified_upi_payments(p_minutes INTEGER DEFAULT 15)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.bookings
     SET payment_verification_status = 'timeout',
         updated_at = NOW()
   WHERE payment_method = 'upi'
     AND payment_verification_status IN ('initiated','waiting_verification')
     AND status NOT IN ('cancelled','completed','no_show')
     AND created_at < NOW() - (p_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.expire_unverified_upi_payments(INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION public.expire_unverified_upi_payments(INTEGER) TO service_role;

-- Optional pg_cron (Supabase Dashboard → Database → Extensions → pg_cron):
-- SELECT cron.schedule(
--   'expire-unverified-upi-payments',
--   '*/5 * * * *',
--   $$ SELECT public.expire_unverified_upi_payments(15); $$
-- );

SELECT '✅ 49 — UPI manual-verification payments: salon UPI fields, booking verification workflow, widened CHECKs, timeout fn' AS status;
