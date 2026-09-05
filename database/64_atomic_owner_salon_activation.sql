-- ============================================================================
-- 64 — Atomic customer -> owner activation with first salon creation
-- ============================================================================
--
-- PURPOSE
--   Opening owner onboarding must not change public.users.role. The role changes
--   only when the first salon is successfully inserted, in the same transaction.
--
-- PREREQUISITES
--   Apply all earlier migrations through 63 first, especially 41, 44, 47, 49,
--   50, 55, and 58. This function depends on subscriptions, corrected salon
--   trigger timing, payment-detail columns, the employee role, and gender_serve.
--
-- DATA / API EFFECT
--   * No existing row is modified while this migration is applied.
--   * Existing owner clients may continue POSTing a salon through the old path.
--   * The new RPC is callable only by service_role; mobile/web clients never get
--     direct execution permission.
--   * Bookings, booking foreign keys, booking RPCs, and booking response shapes
--     are not changed.
--
-- FORWARD REPAIR / ROLLBACK
--   Production migrations are forward-only. If the new application path must be
--   disabled, deploy the compatible backend path first, then revoke EXECUTE from
--   service_role in a new migration. Do not edit or remove migration 64 after it
--   has been applied. The functions can be replaced safely by a later migration.
-- ============================================================================

-- Owner trials previously ran only after INSERT on users. A customer promoted
-- at successful salon creation needs the same trial, exactly once.
CREATE OR REPLACE FUNCTION public.create_owner_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription_id UUID;
  v_trial_end TIMESTAMPTZ;
BEGIN
  IF NEW.role <> 'owner' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role = 'owner' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.subscriptions (
    owner_id, status, plan,
    trial_start, trial_end, amount, currency
  )
  VALUES (
    NEW.id, 'trial', 'trimit_pro',
    NOW(), NOW() + INTERVAL '30 days', 29900, 'INR'
  )
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING id, trial_end INTO v_subscription_id, v_trial_end;

  -- Only record trial_started when this invocation actually created the trial.
  IF v_subscription_id IS NOT NULL THEN
    INSERT INTO public.subscription_events (
      subscription_id, owner_id, event_type, to_status, source, metadata
    )
    VALUES (
      v_subscription_id, NEW.id, 'trial_started', 'trial', 'system',
      jsonb_build_object('trial_end', v_trial_end)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_create_owner_trial ON public.users;
CREATE TRIGGER trg_users_create_owner_trial
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_owner_trial();

-- Backend-only transaction for the first salon. The authenticated user id is
-- supplied by the backend after JWT validation; it is never trusted from mobile.
CREATE OR REPLACE FUNCTION public.activate_owner_and_create_salon_v1(
  p_user_id UUID,
  p_salon_id UUID,
  p_salon JSONB
)
RETURNS public.salons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_salon public.salons%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_salon_id IS NULL OR p_salon IS NULL THEN
    RAISE EXCEPTION 'OWNER_ACTIVATION_INVALID_INPUT';
  END IF;

  -- Serializes concurrent attempts for one identity. The existence check and
  -- insert therefore cannot race inside this RPC.
  SELECT * INTO v_user
    FROM public.users
   WHERE id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OWNER_PROFILE_NOT_FOUND';
  END IF;

  IF v_user.role NOT IN ('customer', 'owner') THEN
    RAISE EXCEPTION 'OWNER_ACTIVATION_INVALID_ROLE';
  END IF;

  IF EXISTS (SELECT 1 FROM public.salons WHERE owner_id = p_user_id) THEN
    RAISE EXCEPTION 'OWNER_SALON_EXISTS';
  END IF;

  IF v_user.role = 'customer' THEN
    UPDATE public.users
       SET role = 'owner'
     WHERE id = p_user_id;
  END IF;

  INSERT INTO public.salons (
    id,
    owner_id,
    name,
    description,
    address,
    city,
    latitude,
    longitude,
    phone,
    image_url,
    images,
    opening_time,
    closing_time,
    about,
    auto_accept,
    allow_multiple_bookings_per_slot,
    max_bookings_per_slot,
    upi_id,
    upi_qr_code,
    bank_name,
    account_holder_name,
    bank_account_number,
    bank_ifsc,
    bank_account_holder_name,
    gender_serve,
    created_at
  )
  VALUES (
    p_salon_id,
    p_user_id,
    p_salon->>'name',
    NULLIF(p_salon->>'description', ''),
    p_salon->>'address',
    p_salon->>'city',
    (p_salon->>'latitude')::DOUBLE PRECISION,
    (p_salon->>'longitude')::DOUBLE PRECISION,
    p_salon->>'phone',
    NULLIF(p_salon->>'image_url', ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_salon->'images', '[]'::JSONB))),
      ARRAY[]::TEXT[]
    ),
    COALESCE(NULLIF(p_salon->>'opening_time', ''), '09:00'),
    COALESCE(NULLIF(p_salon->>'closing_time', ''), '21:00'),
    NULLIF(p_salon->>'about', ''),
    COALESCE((p_salon->>'auto_accept')::BOOLEAN, FALSE),
    COALESCE((p_salon->>'allow_multiple_bookings_per_slot')::BOOLEAN, FALSE),
    COALESCE((p_salon->>'max_bookings_per_slot')::INTEGER, 1),
    NULLIF(p_salon->>'upi_id', ''),
    NULLIF(p_salon->>'upi_qr_code', ''),
    NULLIF(p_salon->>'bank_name', ''),
    NULLIF(p_salon->>'account_holder_name', ''),
    NULLIF(p_salon->>'bank_account_number', ''),
    NULLIF(p_salon->>'bank_ifsc', ''),
    NULLIF(p_salon->>'bank_account_holder_name', ''),
    COALESCE(NULLIF(p_salon->>'gender_serve', ''), 'unisex'),
    NOW()
  )
  RETURNING * INTO v_salon;

  RETURN v_salon;
END;
$$;

COMMENT ON FUNCTION public.activate_owner_and_create_salon_v1(UUID, UUID, JSONB) IS
  'Backend-only atomic transition: customer role and first salon are committed together.';

REVOKE ALL ON FUNCTION public.activate_owner_and_create_salon_v1(UUID, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_owner_and_create_salon_v1(UUID, UUID, JSONB)
  TO service_role;

-- Recovery for accounts left as owner-without-salon by the previous navigation
-- flow. It refuses to discard any salon or paid subscription history.
CREATE OR REPLACE FUNCTION public.cancel_empty_owner_workspace_v1(p_user_id UUID)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_user
    FROM public.users
   WHERE id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OWNER_PROFILE_NOT_FOUND';
  END IF;

  IF v_user.role = 'customer' THEN
    RETURN v_user;
  END IF;

  IF v_user.role <> 'owner' THEN
    RAISE EXCEPTION 'OWNER_RECOVERY_INVALID_ROLE';
  END IF;

  IF EXISTS (SELECT 1 FROM public.salons WHERE owner_id = p_user_id) THEN
    RAISE EXCEPTION 'OWNER_RECOVERY_HAS_SALON';
  END IF;

  SELECT * INTO v_subscription
    FROM public.subscriptions
   WHERE owner_id = p_user_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_subscription.status IN ('active', 'grace_period')
       OR v_subscription.razorpay_customer_id IS NOT NULL
       OR v_subscription.razorpay_subscription_id IS NOT NULL
       OR EXISTS (
         SELECT 1
           FROM public.subscription_payments
          WHERE owner_id = p_user_id
            AND status IN ('authorized', 'captured')
       ) THEN
      RAISE EXCEPTION 'OWNER_RECOVERY_HAS_BILLING_HISTORY';
    END IF;

    DELETE FROM public.subscriptions WHERE id = v_subscription.id;
  END IF;

  UPDATE public.users
     SET role = 'customer'
   WHERE id = p_user_id
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$;

COMMENT ON FUNCTION public.cancel_empty_owner_workspace_v1(UUID) IS
  'Backend-only recovery for an owner with no salon and no paid billing history.';

REVOKE ALL ON FUNCTION public.cancel_empty_owner_workspace_v1(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_empty_owner_workspace_v1(UUID)
  TO service_role;

-- VALIDATION (read-only; run after applying)
-- SELECT proname, prosecdef
-- FROM pg_proc
-- WHERE proname IN ('activate_owner_and_create_salon_v1', 'cancel_empty_owner_workspace_v1');
--
-- SELECT event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trg_users_create_owner_trial';

SELECT '64 - atomic owner activation and reversible empty-owner recovery installed' AS status;
