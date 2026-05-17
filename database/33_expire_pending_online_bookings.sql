-- 33: Expire abandoned Razorpay checkouts (HIGH-05 prep — enable cron when online pay ships)

CREATE OR REPLACE FUNCTION public.expire_pending_online_bookings(p_minutes INTEGER DEFAULT 15)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.bookings
     SET status = 'cancelled',
         payment_status = 'failed',
         updated_at = NOW()
   WHERE payment_method = 'online'
     AND payment_status = 'pending'
     AND status NOT IN ('cancelled', 'completed')
     AND created_at < NOW() - (p_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.expire_pending_online_bookings(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.expire_pending_online_bookings(INTEGER) TO service_role;

-- Optional pg_cron (Supabase Dashboard → Database → Extensions → pg_cron):
-- SELECT cron.schedule(
--   'expire-pending-razorpay-bookings',
--   '*/5 * * * *',
--   $$ SELECT public.expire_pending_online_bookings(15); $$
-- );

SELECT 'Migration 33 applied: expire_pending_online_bookings function' AS status;
