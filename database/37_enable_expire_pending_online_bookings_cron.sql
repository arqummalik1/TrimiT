-- 37: Schedule expiry of abandoned online bookings

DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_extension
     WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron extension is not enabled; skipping expire_pending_online_bookings schedule';
    RETURN;
  END IF;

  SELECT jobid
    INTO v_job_id
    FROM cron.job
   WHERE jobname = 'expire-pending-razorpay-bookings'
   LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'expire-pending-razorpay-bookings',
    '*/5 * * * *',
    $cmd$ SELECT public.expire_pending_online_bookings(15); $cmd$
  );
END;
$$;

SELECT 'Migration 37 applied: expire_pending_online_bookings cron scheduled' AS status;
