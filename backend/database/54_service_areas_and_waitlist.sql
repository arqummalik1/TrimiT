-- Migration 54: Service areas (geofence) + waitlist leads
-- Forward-only, additive. Apply manually in the Supabase SQL Editor (prod).
--
-- WHY
-- ───────────────────────────────────────────────────────────────────────────
-- TrimiT is live only in Jammu. Users outside Jammu currently see an empty
-- "No Salons Found" list, which reads like a bug. This migration introduces a
-- config-driven serviceability model so the app can say, clearly:
--   "We're not in your city yet — TrimiT is currently live in Jammu."
-- and capture the user as a demand lead (waitlist).
--
-- DESIGN — center + radius geofence (durable, reliable, never breaks)
-- ───────────────────────────────────────────────────────────────────────────
-- A "service area" is a circle: a center point (lat/lng) + a radius in km.
-- A user is serviceable if their GPS point is within ANY active area's radius
-- (great-circle / haversine distance). This is the same primitive Swiggy/
-- Zomato/Uber use for simple city coverage. To add a city later you INSERT a
-- new row here — no app deploy, no Play Store rebuild.
--
-- Jammu is seeded below: center 32.7266, 74.8570 (city centre), radius 30 km
-- (covers Jammu city + immediate suburbs). Tune radius_km any time in the
-- Supabase SQL Editor; the change is live instantly for all clients.

-- ── 1. service_areas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_areas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                 -- "Jammu"
  slug            text NOT NULL UNIQUE,          -- "jammu"
  center_lat      double precision NOT NULL,
  center_lng      double precision NOT NULL,
  radius_km       double precision NOT NULL DEFAULT 30,
  -- TRUE  = we serve here now (inside radius => serviceable).
  is_active       boolean NOT NULL DEFAULT true,
  -- TRUE  = show "launching soon" instead of "not available" for this area.
  launching_soon  boolean NOT NULL DEFAULT false,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_areas IS
  'Config-driven city coverage. A user is serviceable if within radius_km of an active area centre. Add a city by inserting a row — no deploy needed.';
COMMENT ON COLUMN public.service_areas.radius_km IS
  'Coverage radius from the centre point, in kilometres. Tune live in the SQL editor.';
COMMENT ON COLUMN public.service_areas.is_active IS
  'TRUE = serving now. FALSE = not serviceable (used with launching_soon for "coming soon").';

-- Seed: Jammu (only live city in v1). Idempotent on slug.
INSERT INTO public.service_areas (name, slug, center_lat, center_lng, radius_km, is_active, launching_soon, display_order)
VALUES ('Jammu', 'jammu', 32.7266, 74.8570, 30, true, false, 0)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. waitlist_leads ────────────────────────────────────────────────────────
-- Out-of-area users who asked to be notified when TrimiT launches near them.
-- This is the founder demand pipeline (which city to launch next).
CREATE TABLE IF NOT EXISTS public.waitlist_leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NULL,
  email                 text NOT NULL,
  lat                   double precision NULL,
  lng                   double precision NULL,
  area_label            text NULL,            -- optional human area text
  nearest_area_slug     text NULL,            -- closest active area at capture time
  nearest_distance_km   double precision NULL,
  source                text NOT NULL DEFAULT 'mobile',   -- 'mobile' | 'web'
  user_id               uuid NULL,            -- set if the lead was logged in
  notified_at           timestamptz NULL,     -- set when we email "we launched"
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.waitlist_leads IS
  'Demand leads from users outside the service area who asked to be notified at launch.';

-- One lead per email. The backend always stores email pre-normalized
-- (trimmed + lowercased), so a plain unique index on the column is effectively
-- case-insensitive AND is targetable by PostgREST upserts (on_conflict=email).
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_leads_email_unique
  ON public.waitlist_leads (email);

-- Fast "where is demand?" grouping for the admin dashboard.
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_created_at
  ON public.waitlist_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_nearest_area
  ON public.waitlist_leads (nearest_area_slug);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
-- service_areas: world-readable (clients need it to render coverage), but only
-- the service role may write. waitlist_leads: NO public access at all — the
-- backend writes/reads exclusively via the service role (RLS bypass), exactly
-- like early_access_emails. This keeps lead PII off the public API surface.
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_areas_public_read ON public.service_areas;
CREATE POLICY service_areas_public_read
  ON public.service_areas FOR SELECT
  USING (true);

-- No policies on waitlist_leads → only service role can touch it.
