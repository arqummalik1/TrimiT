-- ============================================================================
-- 44 - FIX: new salon creation fails with subscriptions_salon_id_fkey violation
-- ============================================================================
--
-- ROOT CAUSE (regression from migration 41):
--   Migration 41 added a BEFORE INSERT trigger on public.salons
--   (trg_salons_link_subscription -> link_salon_to_subscription) that did TWO
--   things in one function:
--     1. UPDATE public.subscriptions SET salon_id = NEW.id  (back-link)
--     2. NEW.subscription_active := subscription_grants_access(status)
--
--   Step 1 runs at BEFORE INSERT time, when the salons row does NOT exist yet.
--   Setting subscriptions.salon_id = NEW.id therefore points the FK
--   subscriptions_salon_id_fkey (subscriptions.salon_id -> salons.id) at a row
--   that has not been written, so Postgres raises:
--     "insert or update on table \"subscriptions\" violates foreign key
--      constraint \"subscriptions_salon_id_fkey\""
--   and the whole salon INSERT is rolled back.
--
--   Existing salons were created BEFORE migration 41 added the trigger, so they
--   were unaffected. Every NEW owner has been unable to create a salon since 41
--   was applied.
--
-- FIX (forward-only; migration 41 left untouched):
--   Split the logic by trigger timing.
--     * BEFORE INSERT  -> only compute NEW.subscription_active (no FK touched).
--     * AFTER  INSERT  -> back-link the subscription now that salons.id exists.
--
-- SAFE / IDEMPOTENT: uses CREATE OR REPLACE + DROP TRIGGER IF EXISTS. No data
-- migration, no destructive change. Re-running is harmless.
-- ============================================================================

-- 1. BEFORE INSERT: set the denormalized visibility flag only.
CREATE OR REPLACE FUNCTION public.set_salon_subscription_active()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
    FROM public.subscriptions
   WHERE owner_id = NEW.owner_id
   LIMIT 1;

  -- Default TRUE (no subscription row yet => treat as active to avoid hiding).
  NEW.subscription_active := COALESCE(public.subscription_grants_access(v_status), TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AFTER INSERT: back-link the owner's subscription to the new salon.
--    Runs after the salons row exists, so the FK is satisfied.
CREATE OR REPLACE FUNCTION public.link_salon_to_subscription()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.subscriptions
     SET salon_id = NEW.id
   WHERE owner_id = NEW.owner_id
     AND salon_id IS NULL;
  RETURN NULL;  -- return value ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate triggers with the corrected timing.
--    Old combined BEFORE INSERT trigger is removed and replaced by two triggers.
DROP TRIGGER IF EXISTS trg_salons_link_subscription ON public.salons;

DROP TRIGGER IF EXISTS trg_salons_set_subscription_active ON public.salons;
CREATE TRIGGER trg_salons_set_subscription_active
  BEFORE INSERT ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.set_salon_subscription_active();

CREATE TRIGGER trg_salons_link_subscription
  AFTER INSERT ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.link_salon_to_subscription();

SELECT '✅ 44 - salon-subscription trigger FK ordering fixed (new salons can be created).' AS status;
