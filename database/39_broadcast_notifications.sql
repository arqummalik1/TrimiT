-- 39: Broadcast notifications (Zomato/Blinkit-style marketing pushes).
-- Adds an audit log for every broadcast sent so admins have a record and can
-- compute simple delivery stats. Per-user preference (notify_promotional) and
-- per-user push_enabled master switch already live on the users table from
-- migration 24, so no user-table change is needed.

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL CHECK (audience IN ('customers', 'owners', 'all')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 80),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 240),
  -- Optional structured payload that we forward to Expo as `data` so the
  -- mobile client can decide what (if anything) to deep-link to.
  data JSONB DEFAULT '{}'::jsonb,
  -- Aggregate counters; computed by the backend after fan-out.
  recipients_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_created_at
  ON public.broadcast_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_audience_created_at
  ON public.broadcast_notifications (audience, created_at DESC);

-- RLS: only service-role (admin endpoint) reads/writes; no direct access.
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broadcast_notifications_no_direct_access" ON public.broadcast_notifications;
CREATE POLICY "broadcast_notifications_no_direct_access"
  ON public.broadcast_notifications
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.broadcast_notifications FROM authenticated, anon;

SELECT 'Migration 39 applied: broadcast_notifications table created' AS status;
