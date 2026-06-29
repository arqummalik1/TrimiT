-- ============================================================================
-- 51 — Website visitor analytics (page_views)
-- ----------------------------------------------------------------------------
-- Forward-only, additive. Apply MANUALLY in the Supabase SQL Editor (prod).
--
-- Lightweight, privacy-friendly page-view counter for the admin dashboard
-- ("visitors on my website"). The web app pings POST /api/v1/analytics/pageview
-- on navigation; rows are written via the service role. No PII: we store a
-- random client-generated session id (not tied to identity), the path, and an
-- optional referrer host. Aggregates (today / 7d / 30d / unique sessions) are
-- read by the admin dashboard.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path        TEXT NOT NULL,
  referrer    TEXT,
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session    ON public.page_views (session_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
-- Written only by the service role (the backend pageview endpoint); read only
-- by the service role (admin dashboard). No policies => no direct client access.

SELECT '✅ 51 — page_views analytics table created' AS status;
