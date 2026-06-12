-- ============================================================================
-- 41 - SUBSCRIPTIONS (TrimiT Pro — SaaS owner subscriptions via Razorpay)
-- ----------------------------------------------------------------------------
-- Forward-only, additive migration. Apply MANUALLY in the Supabase SQL Editor
-- against the production project. Does NOT touch existing tables destructively.
--
-- Adds:
--   * public.subscriptions          (one row per owner; trial + paid lifecycle)
--   * public.subscription_payments  (every Razorpay charge / invoice)
--   * public.subscription_events    (immutable audit trail of state changes)
--   * public.webhook_logs           (raw Razorpay webhooks, idempotency guard)
--   * public.salons.subscription_active (denormalized flag for customer queries)
--   * triggers: auto-create 14-day trial on owner signup, link salon, sync flag
--   * pg_cron job: expire lapsed trials daily
--
-- Plan: TrimiT Pro — ₹299 / month (29900 paise), INR, monthly recurring.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Generic updated_at trigger (idempotent; safe if it already exists)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: which statuses count as "premium access granted"
CREATE OR REPLACE FUNCTION public.subscription_grants_access(p_status TEXT)
RETURNS BOOLEAN AS $$
  SELECT p_status IN ('trial', 'active', 'grace_period');
$$ LANGUAGE sql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 1. subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  salon_id                UUID REFERENCES public.salons(id) ON DELETE SET NULL,

  plan                    TEXT NOT NULL DEFAULT 'trimit_pro',
  status                  TEXT NOT NULL DEFAULT 'trial'
                            CHECK (status IN (
                              'trial', 'active', 'expired',
                              'cancelled', 'payment_failed',
                              'past_due', 'grace_period'
                            )),

  -- Trial window (set at owner account creation)
  trial_start             TIMESTAMPTZ,
  trial_end               TIMESTAMPTZ,

  -- Paid billing window (set from Razorpay subscription/charges)
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  next_renewal_at         TIMESTAMPTZ,

  -- Cancellation
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at            TIMESTAMPTZ,

  -- Razorpay references
  razorpay_customer_id    TEXT,
  razorpay_subscription_id TEXT,
  razorpay_plan_id        TEXT,

  -- Money (store paise to avoid float drift; mirror booking convention)
  amount                  INTEGER NOT NULL DEFAULT 29900,
  currency                TEXT NOT NULL DEFAULT 'INR',

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id   ON public.subscriptions (owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_salon_id   ON public.subscriptions (salon_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end  ON public.subscriptions (trial_end);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_rzp_sub
  ON public.subscriptions (razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. subscription_payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id         UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  owner_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  razorpay_payment_id     TEXT UNIQUE,
  razorpay_invoice_id     TEXT,
  razorpay_order_id       TEXT,
  razorpay_subscription_id TEXT,

  amount                  INTEGER NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'INR',
  status                  TEXT NOT NULL DEFAULT 'created'
                            CHECK (status IN (
                              'created', 'authorized', 'captured',
                              'failed', 'refunded'
                            )),
  method                  TEXT,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_subscription_id ON public.subscription_payments (subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_owner_id        ON public.subscription_payments (owner_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status          ON public.subscription_payments (status);
CREATE INDEX IF NOT EXISTS idx_sub_payments_paid_at         ON public.subscription_payments (paid_at);

-- ---------------------------------------------------------------------------
-- 3. subscription_events (immutable audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id         UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  owner_id                UUID REFERENCES public.users(id) ON DELETE CASCADE,

  event_type              TEXT NOT NULL,         -- e.g. trial_started, activated, charged...
  from_status             TEXT,
  to_status               TEXT,
  source                  TEXT NOT NULL DEFAULT 'system'
                            CHECK (source IN ('system', 'webhook', 'owner', 'admin')),
  metadata                JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_subscription_id ON public.subscription_events (subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_owner_id        ON public.subscription_events (owner_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_type            ON public.subscription_events (event_type);
CREATE INDEX IF NOT EXISTS idx_sub_events_created_at      ON public.subscription_events (created_at);

-- ---------------------------------------------------------------------------
-- 4. webhook_logs (raw Razorpay events; idempotency + replay safety)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                TEXT NOT NULL DEFAULT 'razorpay',
  event_id                TEXT UNIQUE,           -- Razorpay x-razorpay-event-id (dedupe)
  event_type              TEXT,
  payload                 JSONB,
  signature_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  processed               BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error        TEXT,
  received_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed  ON public.webhook_logs (processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received   ON public.webhook_logs (received_at);

-- ---------------------------------------------------------------------------
-- 5. salons.subscription_active — denormalized flag read by customer queries
--    TRUE while owner has access (trial/active/grace); FALSE when lapsed.
-- ---------------------------------------------------------------------------
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_salons_subscription_active
  ON public.salons (subscription_active);

-- ============================================================================
-- 6. RLS
-- ============================================================================
ALTER TABLE public.subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs           ENABLE ROW LEVEL SECURITY;

-- subscriptions: owner reads own row only. All writes are service-role (bypasses RLS).
DROP POLICY IF EXISTS "Owners read own subscription" ON public.subscriptions;
CREATE POLICY "Owners read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- subscription_payments: owner reads own history only.
DROP POLICY IF EXISTS "Owners read own payments" ON public.subscription_payments;
CREATE POLICY "Owners read own payments" ON public.subscription_payments
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- subscription_events: owner reads own audit trail only.
DROP POLICY IF EXISTS "Owners read own events" ON public.subscription_events;
CREATE POLICY "Owners read own events" ON public.subscription_events
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- webhook_logs: NO policies -> only service-role can touch it (RLS denies everyone else).

GRANT SELECT ON public.subscriptions         TO authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT SELECT ON public.subscription_events   TO authenticated;

-- ============================================================================
-- 7. Lifecycle triggers
-- ============================================================================

-- 7a. Auto-create a 14-day trial when an OWNER profile is created.
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
      NOW(), NOW() + INTERVAL '14 days', 29900, 'INR'
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

DROP TRIGGER IF EXISTS trg_users_create_owner_trial ON public.users;
CREATE TRIGGER trg_users_create_owner_trial
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_owner_trial();

-- 7b. Link a newly created salon to its owner's subscription, and set the
--     salon's visibility flag from the current subscription status.
CREATE OR REPLACE FUNCTION public.link_salon_to_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  UPDATE public.subscriptions
     SET salon_id = NEW.id
   WHERE owner_id = NEW.owner_id
     AND salon_id IS NULL;

  SELECT status INTO v_status
    FROM public.subscriptions
   WHERE owner_id = NEW.owner_id
   LIMIT 1;

  -- Default TRUE (no subscription row yet => treat as active to avoid hiding).
  NEW.subscription_active := COALESCE(public.subscription_grants_access(v_status), TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_salons_link_subscription ON public.salons;
CREATE TRIGGER trg_salons_link_subscription
  BEFORE INSERT ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.link_salon_to_subscription();

-- 7c. Keep salons.subscription_active in sync whenever status changes.
CREATE OR REPLACE FUNCTION public.sync_salon_subscription_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.salons
       SET subscription_active = public.subscription_grants_access(NEW.status)
     WHERE owner_id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_subscriptions_sync_salon ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_sync_salon
  AFTER UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_salon_subscription_active();

-- ============================================================================
-- 8. Trial expiry job (forward-only; flips lapsed trials to 'expired')
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_lapsed_trials()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH lapsed AS (
    UPDATE public.subscriptions
       SET status = 'expired', updated_at = NOW()
     WHERE status = 'trial'
       AND trial_end IS NOT NULL
       AND trial_end < NOW()
    RETURNING id, owner_id
  )
  INSERT INTO public.subscription_events (
    subscription_id, owner_id, event_type, from_status, to_status, source
  )
  SELECT id, owner_id, 'trial_expired', 'trial', 'expired', 'system'
    FROM lapsed;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily at 00:05 if pg_cron is available.
DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not enabled; skipping expire-lapsed-trials schedule';
    RETURN;
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'expire-lapsed-trials' LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'expire-lapsed-trials',
    '5 0 * * *',
    $cmd$ SELECT public.expire_lapsed_trials(); $cmd$
  );
END;
$$;

SELECT '✅ 41 - Subscriptions schema, RLS, triggers & cron created.' AS status;
