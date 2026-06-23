-- ==========================================
-- 47 — Add bank account details to salons
-- For future PayU split-payment settlement.
-- ==========================================

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT;

-- Existing RLS policies already protect salons:
--   • "Anyone can view salons" (SELECT) — bank cols will be stripped by the API
--   • "Owners can update their salons" (UPDATE) — only the owner can write
-- No new RLS policy needed.

COMMENT ON COLUMN public.salons.bank_account_number IS 'Bank account number for settlement payouts (PayU). Stripped from public API responses.';
COMMENT ON COLUMN public.salons.bank_ifsc IS 'IFSC code for settlement payouts (PayU). Format: ^[A-Z]{4}0[A-Z0-9]{6}$';
COMMENT ON COLUMN public.salons.bank_account_holder_name IS 'Name on the bank account for settlement payouts.';

SELECT '✅ 47 — Bank details columns added to salons' AS status;
