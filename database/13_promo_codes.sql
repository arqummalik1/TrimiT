-- ==========================================
-- 13 - PROMO CODES & DISCOUNT SYSTEM
-- ==========================================

-- Promotions table for discount codes
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount DECIMAL(10,2), -- For percentage discounts, cap the max discount amount
  min_order_value DECIMAL(10,2) DEFAULT 0, -- Minimum booking amount to use promo
  expires_at TIMESTAMPTZ,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE, -- NULL = global promo
  usage_limit INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) -- Admin or salon owner
);

-- Add promo tracking to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);

-- Promo usage tracking (for analytics)
CREATE TABLE IF NOT EXISTS public.promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotions_code ON public.promotions(code) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promotions_salon ON public.promotions(salon_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promotions_expires ON public.promotions(expires_at) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promo_usage_promo ON public.promo_usage(promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON public.promo_usage(user_id);

-- RLS Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_usage ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promotions
CREATE POLICY "Anyone can view active promotions"
  ON public.promotions FOR SELECT
  USING (active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Only owners can create promotions for their salons
CREATE POLICY "Owners can create salon promotions"
  ON public.promotions FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM public.salons WHERE id = salon_id
    )
  );

-- Only owners can update their salon promotions
CREATE POLICY "Owners can update salon promotions"
  ON public.promotions FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.salons WHERE id = salon_id
    )
  );

-- Users can view their own promo usage
CREATE POLICY "Users can view own promo usage"
  ON public.promo_usage FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert promo usage (via service role)
CREATE POLICY "System can insert promo usage"
  ON public.promo_usage FOR INSERT
  WITH CHECK (TRUE);

-- Function to validate and apply promo code
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
  -- Fetch the promo
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE code = p_code
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (salon_id IS NULL OR salon_id = p_salon_id)
    AND (usage_limit IS NULL OR used_count < usage_limit)
    AND p_booking_amount >= COALESCE(min_order_value, 0);
  
  -- If not found, return error
  IF v_promo.id IS NULL THEN
    RETURN json_build_object(
      'valid', FALSE,
      'error', 'Invalid or expired promo code'
    );
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'flat' THEN
    v_discount := LEAST(v_promo.discount_value, p_booking_amount);
  ELSE -- percent
    v_discount := (p_booking_amount * v_promo.discount_value / 100);
    IF v_promo.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_promo.max_discount);
    END IF;
  END IF;
  
  v_final_amount := p_booking_amount - v_discount;
  
  RETURN json_build_object(
    'valid', TRUE,
    'promo_id', v_promo.id,
    'discount_amount', v_discount,
    'final_amount', v_final_amount,
    'description', v_promo.description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment promo usage count
CREATE OR REPLACE FUNCTION increment_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promo_code IS NOT NULL THEN
    UPDATE public.promotions
    SET used_count = used_count + 1
    WHERE code = NEW.promo_code;
    
    -- Log usage
    INSERT INTO public.promo_usage (promo_id, booking_id, user_id, discount_applied)
    SELECT id, NEW.id, NEW.user_id, NEW.discount_amount
    FROM public.promotions
    WHERE code = NEW.promo_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_promo_usage
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_promo_usage();

-- Sample promo codes for testing
INSERT INTO public.promotions (code, description, discount_type, discount_value, max_discount, min_order_value, expires_at, active)
VALUES 
  ('TRIMIT50', 'Get 50% off up to ₹100', 'percent', 50, 100, 200, NOW() + INTERVAL '30 days', TRUE),
  ('FIRST100', 'Flat ₹100 off on first booking', 'flat', 100, NULL, 300, NOW() + INTERVAL '60 days', TRUE),
  ('WELCOME20', '20% off on any service', 'percent', 20, 200, 0, NOW() + INTERVAL '90 days', TRUE)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.promotions IS 'Promo codes and discount campaigns';
COMMENT ON TABLE public.promo_usage IS 'Tracks promo code redemptions for analytics';
COMMENT ON FUNCTION validate_promo_code IS 'Validates promo code and calculates discount amount';
