-- ============================================================================
-- 43 - Run trial expiry frequently (close the subscription_active lag window)
-- ----------------------------------------------------------------------------
-- Forward-only, additive. Apply MANUALLY in the Supabase SQL Editor against the
-- production project. Touches ONLY the pg_cron schedule of an existing job.
--
-- WHY:
--   Trial expiry is materialized into subscriptions.status only by the
--   expire_lapsed_trials() job. In migration 41 that job ran once daily
--   (00:05). Owner gating (require_active_subscription -> compute_access) is
--   real-time off trial_end, but the denormalized salons.subscription_active
--   flag — read by create_booking, get_nearby_salons_v1, and the customer
--   apps — only flips when status changes. So for up to ~24h after trial_end
--   the owner was locked out while customers could still see and book the
--   salon (bookings the owner cannot manage).
--
-- FIX:
--   Re-schedule the same job to run every 10 minutes. This shrinks the
--   divergence window from hours to <=10 min with no API/contract/read-path
--   change. The expiry query is a cheap, indexed UPDATE
--   (status='trial' AND trial_end < NOW()), so frequent runs are negligible.
--
--   Owner-side gating stays real-time; this only keeps the customer-facing
--   denormalized flag promptly in sync.
-- ============================================================================

DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not enabled; skipping expire-lapsed-trials reschedule';
    RETURN;
  END IF;

  -- Drop the existing daily schedule if present.
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'expire-lapsed-trials' LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  -- Re-schedule every 10 minutes.
  PERFORM cron.schedule(
    'expire-lapsed-trials',
    '*/10 * * * *',
    $cmd$ SELECT public.expire_lapsed_trials(); $cmd$
  );
END;
$$;

-- Materialize any already-lapsed trials immediately so prod is consistent the
-- moment this migration is applied (don't wait for the first scheduled run).
SELECT public.expire_lapsed_trials() AS trials_expired_now;

SELECT '✅ 43 - expire-lapsed-trials now runs every 10 minutes.' AS status;
