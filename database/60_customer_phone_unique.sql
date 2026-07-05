-- 60 — Customer phone required + unique (anti-abuse foundation for welcome voucher)
-- Forward-only. Apply after 59.

-- Normalize existing phones to E.164 India where possible (best-effort)
UPDATE public.users
SET phone = '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE role = 'customer'
  AND phone IS NOT NULL
  AND phone !~ '^\+91[6-9][0-9]{9}$'
  AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[6-9][0-9]{9}$';

-- One customer account per Indian mobile (future phone-OTP login ready)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_customer_phone_unique
  ON public.users (phone)
  WHERE role = 'customer' AND phone IS NOT NULL;

COMMENT ON INDEX idx_users_customer_phone_unique IS
  'Prevents duplicate customer signups on the same mobile; supports welcome voucher binding.';
