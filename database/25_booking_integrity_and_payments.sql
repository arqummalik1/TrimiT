-- 25: Booking slot integrity, Razorpay order id, pending payment expiry

-- Razorpay order id on bookings (for real order.create + verify)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_order_id
  ON public.bookings (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Partial unique index: one active booking per salon/date/slot (multi-customer race guard)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
  ON public.bookings (salon_id, booking_date, time_slot)
  WHERE status <> 'cancelled';

-- Cancel abandoned Razorpay checkouts after 15 minutes (requires pg_cron on Supabase)
-- Enable in Dashboard: Database → Extensions → pg_cron
-- SELECT cron.schedule(
--   'expire-pending-razorpay-bookings',
--   '*/5 * * * *',
--   $$
--   UPDATE public.bookings
--   SET status = 'cancelled', payment_status = 'failed', updated_at = NOW()
--   WHERE payment_method = 'online'
--     AND payment_status = 'pending'
--     AND status NOT IN ('cancelled', 'completed')
--     AND created_at < NOW() - INTERVAL '15 minutes';
--   $$
-- );

SELECT 'Migration 25 applied: razorpay_order_id + uq_bookings_active_slot' AS status;
