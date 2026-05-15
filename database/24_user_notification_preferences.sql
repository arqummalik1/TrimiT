-- ============================================================================
-- 24 - User notification preferences + push dedupe log
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_bookings BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_booking_updates BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_promotional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_reminders BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS show_offers BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_events_booking_event_unique UNIQUE (booking_id, event_type, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_events_booking
  ON public.notification_events(booking_id);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Backend service role only for inserts; no client policies required for v1

SELECT '✅ 24 - user notification preferences + notification_events' AS status;
