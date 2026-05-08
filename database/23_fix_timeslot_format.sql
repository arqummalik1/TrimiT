-- ==========================================
-- 23 - FIX TIME_SLOT FORMAT + RLS INSERT POLICY
-- Run this in Supabase SQL Editor
-- 1. Normalizes all time_slot values to HH:MM
-- 2. Adds INSERT policy on users table for profile creation
-- 3. Upsert-safe profile creation grant
-- ==========================================

-- ─── Part A: Normalize time_slot format ──────────────────────────────────────

-- Preview first (safe to run anytime):
-- SELECT id, time_slot FROM public.bookings WHERE time_slot ~ '^\d{2}:\d{2}:\d{2}' LIMIT 20;

-- Normalize: strip seconds from any HH:MM:SS values
UPDATE public.bookings
   SET time_slot = LEFT(time_slot, 5)
 WHERE time_slot ~ '^\d{2}:\d{2}:\d{2}';

-- Also normalize any holds that might have been created with seconds
UPDATE public.slot_holds
   SET time_slot = LEFT(time_slot, 5)
 WHERE time_slot ~ '^\d{2}:\d{2}:\d{2}';

-- Verify: no more HH:MM:SS values should remain
DO $$
DECLARE
    v_bad_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_bad_count
      FROM public.bookings
     WHERE time_slot ~ '^\d{2}:\d{2}:\d{2}';
    IF v_bad_count > 0 THEN
        RAISE WARNING 'Still % bookings with HH:MM:SS format — check manually', v_bad_count;
    ELSE
        RAISE NOTICE 'All booking time_slots normalized to HH:MM format ✅';
    END IF;
END $$;

-- ─── Part B: Fix users table RLS for profile creation ────────────────────────
-- The backend uses service_role key for profile creation (correct), but if
-- service_role bypass is disabled on this project, an INSERT policy is needed.

-- Allow service_role to insert (bypass RLS means this is redundant but safe):
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
-- (service_role bypasses RLS by default — no policy needed, but document intent)

-- The real fix: ensure authenticated users can insert their OWN profile row
-- (needed when using anon key or user token for profile creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ─── Part C: Fix the users table UNIQUE + GRANT ───────────────────────────────
-- Allow authenticated role to INSERT into users (was missing — only SELECT/UPDATE were granted)
GRANT INSERT ON public.users TO authenticated;

-- ─── Part D: create_atomic_booking — normalize time_slot comparison ───────────
-- Re-create with LEFT(time_slot, 5) normalization in the capacity check
CREATE OR REPLACE FUNCTION public.create_atomic_booking(
    p_user_id         UUID,
    p_salon_id        UUID,
    p_service_id      UUID,
    p_booking_date    DATE,
    p_time_slot       TEXT,
    p_status          TEXT,
    p_payment_method  TEXT,
    p_payment_status  TEXT,
    p_amount          NUMERIC,
    p_promo_code      TEXT    DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_original_amount NUMERIC DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_allow_multiple  BOOLEAN;
    v_max_bookings    INTEGER;
    v_current_bookings INTEGER;
    v_booking_id      UUID;
    v_normalized_slot TEXT;
BEGIN
    -- Normalize time slot to HH:MM
    v_normalized_slot := LEFT(p_time_slot, 5);

    -- Lock the salon row to serialize bookings per salon
    SELECT allow_multiple_bookings_per_slot, COALESCE(max_bookings_per_slot, 1)
      INTO v_allow_multiple, v_max_bookings
      FROM public.salons
     WHERE id = p_salon_id
     FOR SHARE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Salon not found');
    END IF;

    -- Count existing bookings for this slot (normalize stored time_slot too)
    SELECT COUNT(*) INTO v_current_bookings
      FROM public.bookings
     WHERE salon_id     = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND status <> 'cancelled';

    -- Capacity rules
    IF (NOT v_allow_multiple) AND v_current_bookings > 0 THEN
        RETURN json_build_object('success', false, 'error', 'This slot is already fully booked.');
    END IF;

    IF v_allow_multiple AND v_current_bookings >= v_max_bookings THEN
        RETURN json_build_object('success', false, 'error', 'This slot has reached maximum capacity.');
    END IF;

    -- Insert with normalized time_slot
    INSERT INTO public.bookings (
        user_id,
        salon_id,
        service_id,
        booking_date,
        time_slot,
        status,
        payment_method,
        payment_status,
        amount,
        promo_code,
        discount_amount,
        original_amount
    ) VALUES (
        p_user_id,
        p_salon_id,
        p_service_id,
        p_booking_date,
        v_normalized_slot,  -- always store HH:MM
        p_status,
        p_payment_method,
        p_payment_status,
        p_amount,
        p_promo_code,
        p_discount_amount,
        p_original_amount
    ) RETURNING id INTO v_booking_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_atomic_booking(
    UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC
) TO authenticated;

SELECT '✅ 23 - time_slot normalization, RLS fix, and atomic booking update applied!' AS status;
