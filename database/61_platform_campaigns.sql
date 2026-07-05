-- 61 — Platform campaigns (Lane B: TrimiT-funded welcome + future festival offers)
-- Forward-only. Apply after 60.

CREATE TABLE IF NOT EXISTS public.platform_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'welcome'
    CHECK (campaign_type IN ('welcome', 'festival', 'custom')),
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 10 CHECK (validity_days > 0),
  first_booking_only BOOLEAN NOT NULL DEFAULT TRUE,
  auto_apply BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaign_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.platform_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  code TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  discount_applied DECIMAL(10,2),
  UNIQUE (campaign_id, phone_e164),
  UNIQUE (campaign_id, user_id)
);

-- Salons excluded from a campaign (default: all salons participate)
CREATE TABLE IF NOT EXISTS public.campaign_salon_exclusions (
  campaign_id UUID NOT NULL REFERENCES public.platform_campaigns(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_grants_user_active
  ON public.campaign_grants (user_id, expires_at)
  WHERE redeemed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_grants_code
  ON public.campaign_grants (UPPER(code));

ALTER TABLE public.platform_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_salon_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own campaign grants"
  ON public.campaign_grants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone read active platform campaigns"
  ON public.platform_campaigns FOR SELECT
  USING (active = TRUE);

-- Validate platform campaign grant at checkout
CREATE OR REPLACE FUNCTION validate_campaign_grant(
  p_code TEXT,
  p_salon_id UUID,
  p_user_id UUID,
  p_booking_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_campaign public.platform_campaigns;
  v_grant public.campaign_grants;
  v_discount DECIMAL;
  v_final_amount DECIMAL;
  v_completed INTEGER;
  v_excluded BOOLEAN;
BEGIN
  SELECT * INTO v_campaign
  FROM public.platform_campaigns
  WHERE UPPER(code) = UPPER(p_code) AND active = TRUE;

  IF v_campaign.id IS NULL THEN
    RETURN json_build_object('valid', FALSE, 'error', 'Invalid platform offer');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.campaign_salon_exclusions
    WHERE campaign_id = v_campaign.id AND salon_id = p_salon_id
  ) INTO v_excluded;

  IF v_excluded THEN
    RETURN json_build_object(
      'valid', FALSE,
      'error', 'This offer is not available at this salon'
    );
  END IF;

  SELECT * INTO v_grant
  FROM public.campaign_grants
  WHERE campaign_id = v_campaign.id
    AND user_id = p_user_id
    AND UPPER(code) = UPPER(p_code)
    AND redeemed_at IS NULL
    AND expires_at > NOW();

  IF v_grant.id IS NULL THEN
    RETURN json_build_object(
      'valid', FALSE,
      'error', 'Offer not found or expired'
    );
  END IF;

  IF p_booking_amount < COALESCE(v_campaign.min_order_value, 0) THEN
    RETURN json_build_object(
      'valid', FALSE,
      'error', format('Minimum order is ₹%s', v_campaign.min_order_value::INTEGER)
    );
  END IF;

  IF v_campaign.first_booking_only THEN
    SELECT COUNT(*) INTO v_completed
    FROM public.bookings
    WHERE user_id = p_user_id AND status NOT IN ('cancelled');

    IF v_completed > 0 THEN
      RETURN json_build_object(
        'valid', FALSE,
        'error', 'This offer is valid on your first booking only'
      );
    END IF;
  END IF;

  IF v_campaign.discount_type = 'flat' THEN
    v_discount := LEAST(v_campaign.discount_value, p_booking_amount);
  ELSE
    v_discount := (p_booking_amount * v_campaign.discount_value / 100);
  END IF;

  v_final_amount := GREATEST(p_booking_amount - v_discount, 0);

  RETURN json_build_object(
    'valid', TRUE,
    'grant_id', v_grant.id,
    'campaign_id', v_campaign.id,
    'code', v_campaign.code,
    'discount_amount', v_discount,
    'final_amount', v_final_amount,
    'description', COALESCE(v_campaign.description, v_campaign.name),
    'source', 'platform',
    'auto_apply', v_campaign.auto_apply
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark grant redeemed when booking is created with platform promo
CREATE OR REPLACE FUNCTION redeem_campaign_grant_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promo_code IS NOT NULL AND NEW.discount_amount > 0 THEN
    UPDATE public.campaign_grants g
    SET
      redeemed_at = NOW(),
      booking_id = NEW.id,
      discount_applied = NEW.discount_amount
    FROM public.platform_campaigns c
    WHERE g.campaign_id = c.id
      AND UPPER(g.code) = UPPER(NEW.promo_code)
      AND g.user_id = NEW.user_id
      AND g.redeemed_at IS NULL
      AND g.expires_at > NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_redeem_campaign_grant ON public.bookings;
CREATE TRIGGER trigger_redeem_campaign_grant
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION redeem_campaign_grant_on_booking();

-- Launch welcome campaign: TRIMIT50 — flat ₹50, min ₹149, 10 days, auto-apply
INSERT INTO public.platform_campaigns (
  code, name, campaign_type, description,
  discount_type, discount_value, min_order_value,
  validity_days, first_booking_only, auto_apply, active
)
VALUES (
  'TRIMIT50',
  'Welcome Offer',
  'welcome',
  'Flat ₹50 off your first booking (min order ₹149)',
  'flat', 50, 149,
  10, TRUE, TRUE, TRUE
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_order_value = EXCLUDED.min_order_value,
  validity_days = EXCLUDED.validity_days,
  first_booking_only = EXCLUDED.first_booking_only,
  auto_apply = EXCLUDED.auto_apply,
  active = EXCLUDED.active,
  updated_at = NOW();

COMMENT ON TABLE public.platform_campaigns IS 'Lane B: TrimiT-funded campaigns (welcome, festival)';
COMMENT ON TABLE public.campaign_grants IS 'Per-user issued vouchers bound to phone + user_id';
