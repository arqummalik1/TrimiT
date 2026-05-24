-- 36: Add explicit salon payment-method configuration

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['salon_cash', 'online']::TEXT[];

UPDATE public.salons
   SET payment_methods = ARRAY['salon_cash', 'online']::TEXT[]
 WHERE payment_methods IS NULL
    OR cardinality(payment_methods) = 0;

ALTER TABLE public.salons
  DROP CONSTRAINT IF EXISTS salons_payment_methods_valid;

ALTER TABLE public.salons
  ADD CONSTRAINT salons_payment_methods_valid
  CHECK (
    payment_methods IS NOT NULL
    AND cardinality(payment_methods) > 0
    AND payment_methods <@ ARRAY['salon_cash', 'online']::TEXT[]
  );

SELECT 'Migration 36 applied: salons.payment_methods added' AS status;
