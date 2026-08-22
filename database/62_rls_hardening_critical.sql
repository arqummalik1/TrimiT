-- ==========================================
-- 62 — RLS hardening (critical / high from audit)
--
-- Production-safe intent:
-- - All app clients mutate users / bookings / promo_usage through FastAPI,
--   which writes with the service role after authorization.
-- - Direct PostgREST UPDATE/DELETE by anon/authenticated is therefore
--   unnecessary and too broad (role escalation, unpaid booking completion).
--
-- APPLY ORDER (important):
-- 1. Deploy the matching backend FIRST (service_role for public salon
--    detail, owner bank-details, public staff PII strip, salon updates).
-- 2. Then apply this file in the Supabase SQL Editor.
--
-- If column grants on salons/staff are applied before that backend ships,
-- live `select=*` queries fail with permission denied. See PROGRESS_v2
-- (2026-08-03) for the hotfix sequence used when this happened.
--
-- Forward-only. Idempotent DROP POLICY / REVOKE where possible.
-- ==========================================

BEGIN;

-- ── bookings: no direct client UPDATE/DELETE ───────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can update their salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can update salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and owners can update bookings" ON public.bookings;

REVOKE UPDATE ON public.bookings FROM authenticated;
REVOKE UPDATE ON public.bookings FROM anon;
REVOKE DELETE ON public.bookings FROM authenticated;
REVOKE DELETE ON public.bookings FROM anon;

GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;

-- ── users: no unrestricted signup INSERT; lock role / is_blocked ───────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert on signup" ON public.users;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
    AND is_blocked IS NOT DISTINCT FROM (
      SELECT u.is_blocked FROM public.users u WHERE u.id = auth.uid()
    )
    AND deleted_at IS NOT DISTINCT FROM (
      SELECT u.deleted_at FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- ── promo_usage: inserts only via SECURITY DEFINER trigger ─────────────────
ALTER TABLE public.promo_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert promo usage" ON public.promo_usage;

REVOKE INSERT ON public.promo_usage FROM authenticated;
REVOKE INSERT ON public.promo_usage FROM anon;
REVOKE UPDATE ON public.promo_usage FROM authenticated;
REVOKE UPDATE ON public.promo_usage FROM anon;
REVOKE DELETE ON public.promo_usage FROM authenticated;
REVOKE DELETE ON public.promo_usage FROM anon;

GRANT SELECT ON public.promo_usage TO authenticated;

-- ── salons: JWT clients may SELECT (compat) but must not UPDATE bank cols ──
-- Table-level UPDATE implies every column; revoke table UPDATE then grant a
-- safe column list. Bank SELECT hide requires the new backend (service_role
-- public reads) — leave SELECT ON TABLE until that deploy is live, then run
-- the optional block at the bottom of this file.
REVOKE UPDATE ON TABLE public.salons FROM anon;
REVOKE UPDATE ON TABLE public.salons FROM authenticated;

GRANT UPDATE (
  id, owner_id, name, description, address, city, latitude, longitude, phone,
  opening_time, closing_time, images, created_at,
  allow_multiple_bookings_per_slot, max_bookings_per_slot, auto_accept,
  image_url, about, show_offers, payment_methods, subscription_active,
  upi_id, upi_qr_code, accepting_bookings, closed_until, closed_at,
  closed_reason, closed_reminder_sent_at, gender_serve
) ON public.salons TO authenticated;

-- ── Atomic staff invite claim (prevents race / multi-claim) ────────────────
CREATE OR REPLACE FUNCTION public.claim_staff_invite(
  p_user_id uuid,
  p_phone_digits text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_digits text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := NULLIF(regexp_replace(COALESCE(p_phone_digits, ''), '\D', '', 'g'), '');
  IF v_digits IS NOT NULL AND length(v_digits) >= 10 THEN
    v_digits := right(v_digits, 10);
    UPDATE public.staff s
       SET user_id = p_user_id,
           app_access_status = 'active'
     WHERE s.id = (
       SELECT s2.id
         FROM public.staff s2
        WHERE s2.app_access_status = 'pending'
          AND s2.is_active = true
          AND s2.user_id IS NULL
          AND right(regexp_replace(COALESCE(s2.phone, ''), '\D', '', 'g'), 10) = v_digits
        ORDER BY s2.created_at ASC NULLS LAST
        LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
    RETURNING s.id INTO v_staff_id;

    IF v_staff_id IS NOT NULL THEN
      RETURN v_staff_id;
    END IF;
  END IF;

  IF p_email IS NOT NULL AND length(trim(p_email)) > 0 THEN
    UPDATE public.staff s
       SET user_id = p_user_id,
           app_access_status = 'active'
     WHERE s.id = (
       SELECT s2.id
         FROM public.staff s2
        WHERE s2.app_access_status = 'pending'
          AND s2.is_active = true
          AND s2.user_id IS NULL
          AND lower(trim(s2.email)) = lower(trim(p_email))
        ORDER BY s2.created_at ASC NULLS LAST
        LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
    RETURNING s.id INTO v_staff_id;
  END IF;

  RETURN v_staff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_staff_invite(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_staff_invite(uuid, text, text) TO service_role;

COMMIT;

SELECT '✅ 62 — RLS hardening core applied (bookings/users/promo_usage/salon UPDATE/claim RPC)' AS status;

-- ============================================================================
-- OPTIONAL (run ONLY after the matching backend is live on Render):
-- Hide bank columns from JWT SELECT and strip anon staff phone/email.
-- ============================================================================
-- BEGIN;
-- REVOKE ALL ON TABLE public.salons FROM anon;
-- REVOKE ALL ON TABLE public.salons FROM authenticated;
-- GRANT SELECT (
--   id, owner_id, name, description, address, city, latitude, longitude, phone,
--   opening_time, closing_time, images, created_at,
--   allow_multiple_bookings_per_slot, max_bookings_per_slot, auto_accept,
--   image_url, about, show_offers, payment_methods, subscription_active,
--   upi_id, upi_qr_code, accepting_bookings, closed_until, closed_at,
--   closed_reason, closed_reminder_sent_at, gender_serve
-- ) ON public.salons TO anon, authenticated;
-- GRANT INSERT, DELETE ON public.salons TO authenticated;
-- GRANT UPDATE (
--   id, owner_id, name, description, address, city, latitude, longitude, phone,
--   opening_time, closing_time, images, created_at,
--   allow_multiple_bookings_per_slot, max_bookings_per_slot, auto_accept,
--   image_url, about, show_offers, payment_methods, subscription_active,
--   upi_id, upi_qr_code, accepting_bookings, closed_until, closed_at,
--   closed_reason, closed_reminder_sent_at, gender_serve
-- ) ON public.salons TO authenticated;
-- REVOKE ALL ON TABLE public.staff FROM anon;
-- GRANT SELECT (
--   id, salon_id, name, bio, image_url, working_hours, days_off, is_active,
--   average_rating, total_reviews, total_bookings, created_at, updated_at,
--   user_id, app_access_status
-- ) ON public.staff TO anon;
-- COMMIT;
