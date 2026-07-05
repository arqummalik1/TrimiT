-- Migration 53: Salon open/close kill-switch (owner-controlled availability)
-- Forward-only, additive. Apply manually in the Supabase SQL Editor (prod).
--
-- This is a SEPARATE axis from subscription_active:
--   subscription_active  = "has the owner paid?" (system-controlled)
--   accepting_bookings   = "is the owner choosing to take bookings now?" (owner)
--
-- A salon is bookable only when:
--   subscription_active = TRUE
--   AND accepting_bookings = TRUE
--   AND (closed_until IS NULL OR now() >= closed_until)

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS accepting_bookings BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS closed_until TIMESTAMPTZ NULL;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS closed_reason TEXT NULL;

-- Tracks when we last sent the ">24h still closed" reminder for the CURRENT
-- closed session, so the cron doesn't re-send it every run.
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS closed_reminder_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.salons.accepting_bookings IS
  'Owner-controlled kill switch. FALSE = not taking NEW bookings (existing bookings untouched).';
COMMENT ON COLUMN public.salons.closed_until IS
  'Auto-reopen time. NULL = closed indefinitely (manual reopen). When now() passes this, the salon is treated as open.';
COMMENT ON COLUMN public.salons.closed_at IS
  'When the salon was last closed (used for the >24h "still closed" owner reminder).';
COMMENT ON COLUMN public.salons.closed_reason IS
  'Optional owner-supplied reason shown to customers (e.g. "On holiday").';

-- Index to let the auto-reopen cron quickly find salons whose window has passed.
CREATE INDEX IF NOT EXISTS idx_salons_closed_until
  ON public.salons (closed_until)
  WHERE accepting_bookings = FALSE AND closed_until IS NOT NULL;
