-- 46: Lock down direct authenticated UPDATEs on bookings
--
-- Production-safe intent:
-- - Every existing app client already mutates bookings through the FastAPI API.
-- - The API performs explicit owner/customer authorization, then writes with
--   service-role where needed.
-- - Direct PostgREST UPDATE by authenticated users is therefore unnecessary and
--   too broad: an owner token could previously update arbitrary booking columns
--   for its salon (payment_status, amount, user_id, etc.).
--
-- Apply manually in the production Supabase SQL Editor after deploying the
-- matching backend code that uses service-role for authorized booking/payment
-- PATCHes.

BEGIN;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Remove every historical broad owner UPDATE policy name used across migrations.
DROP POLICY IF EXISTS "Owners can update their salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can update salon bookings" ON public.bookings;

-- Block direct table UPDATEs from authenticated/anon clients. The backend
-- service-role bypasses RLS after API-level authorization. This preserves SELECT
-- and INSERT grants so Realtime/listing/booking creation keep working.
REVOKE UPDATE ON public.bookings FROM authenticated;
REVOKE UPDATE ON public.bookings FROM anon;

-- Keep the explicit allowed operations clear for future audits. These are
-- idempotent even if already present from 01_schema.sql.
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;

COMMIT;
