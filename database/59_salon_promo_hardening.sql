-- 59 — Salon promo hardening (Lane A: owner-funded, salon-scoped only)
-- Forward-only. Apply in Supabase SQL Editor after 58.

-- Deactivate legacy global seed promos (Lane B uses platform_campaigns instead)
UPDATE public.promotions SET active = FALSE WHERE salon_id IS NULL;

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_salon_id UUID,
  p_user_id UUID,
  p_booking_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_promo public.promotions;
  v_discount DECIMAL;
  v_final_amount DECIMAL;
BEGIN
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE UPPER(code) = UPPER(p_code)
    AND active = TRUE
    AND salon_id = p_salon_id
    AND salon_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR used_count < usage_limit)
    AND p_booking_amount >= COALESCE(min_order_value, 0);

  IF v_promo.id IS NULL THEN
    RETURN json_build_object(
      'valid', FALSE,
      'error', 'Invalid or expired promo code for this salon'
    );
  END IF;

  IF v_promo.discount_type = 'flat' THEN
    v_discount := LEAST(v_promo.discount_value, p_booking_amount);
  ELSE
    v_discount := (p_booking_amount * v_promo.discount_value / 100);
    IF v_promo.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_promo.max_discount);
    END IF;
  END IF;

  v_final_amount := GREATEST(p_booking_amount - v_discount, 0);

  RETURN json_build_object(
    'valid', TRUE,
    'promo_id', v_promo.id,
    'code', v_promo.code,
    'discount_amount', v_discount,
    'final_amount', v_final_amount,
    'description', v_promo.description,
    'source', 'salon'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
