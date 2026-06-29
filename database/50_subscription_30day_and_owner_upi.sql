-- ============================================================================
-- 50 — Enable subscriptions: 30-day trial + owner UPI captured at signup
-- ----------------------------------------------------------------------------
-- Forward-only, additive. Apply MANUALLY in the Supabase SQL Editor (prod).
--
-- 1. Owner trial is now 30 days (was 14) — updates the signup trigger.
-- 2. Give EVERY existing owner subscription a fresh 30-day trial so enabling
--    enforcement does not instantly freeze current salons (founder-approved).
-- 3. Add public.users.upi_id — captured on the signup screen for salon owners
--    and used to prefill their salon's UPI ID.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Signup trigger → 30-day trial
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_owner_trial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    INSERT INTO public.subscriptions (
      owner_id, status, plan,
      trial_start, trial_end, amount, currency
    )
    VALUES (
      NEW.id, 'trial', 'trimit_pro',
      NOW(), NOW() + INTERVAL '30 days', 29900, 'INR'
    )
    ON CONFLICT (owner_id) DO NOTHING;

    INSERT INTO public.subscription_events (
      subscription_id, owner_id, event_type, to_status, source, metadata
    )
    SELECT s.id, NEW.id, 'trial_started', 'trial', 'system',
           jsonb_build_object('trial_end', s.trial_end)
      FROM public.subscriptions s
     WHERE s.owner_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 2. Fresh 30-day trial for existing owners (so no one is frozen on rollout).
--    Only resets rows that are NOT currently on a paid active subscription.
-- ---------------------------------------------------------------------------
UPDATE public.subscriptions
   SET status      = 'trial',
       trial_start = NOW(),
       trial_end   = NOW() + INTERVAL '30 days',
       updated_at  = NOW()
 WHERE status IN ('trial', 'expired', 'cancelled', 'past_due', 'payment_failed');

-- Re-sync the denormalized salon flag so those salons are visible/bookable.
UPDATE public.salons s
   SET subscription_active = TRUE
  FROM public.subscriptions sub
 WHERE sub.owner_id = s.owner_id
   AND public.subscription_grants_access(sub.status);

-- ---------------------------------------------------------------------------
-- 3. users.upi_id — owner UPI captured at signup, prefills salon.upi_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS upi_id TEXT;

COMMENT ON COLUMN public.users.upi_id IS
  'Owner UPI VPA captured at signup (salon owners). Used to prefill salon.upi_id so customers can pay the salon directly. Not a secret.';

SELECT '✅ 50 — 30-day trial trigger, fresh trial for existing owners, users.upi_id added' AS status;
