-- ==========================================
-- 22 - CREATE SLOT HOLDS SYSTEM
-- Run this in Supabase SQL Editor
-- Creates the slot_holds table and reserve_slot_v1 RPC
-- ==========================================

-- 1. Create slot_holds table
CREATE TABLE IF NOT EXISTS public.slot_holds (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id      UUID        NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    service_id    UUID        NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    booking_date  DATE        NOT NULL,
    time_slot     TEXT        NOT NULL,
    user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_holds_salon_date
    ON public.slot_holds (salon_id, booking_date, expires_at);

CREATE INDEX IF NOT EXISTS idx_slot_holds_user_id
    ON public.slot_holds (user_id);

CREATE INDEX IF NOT EXISTS idx_slot_holds_expires_at
    ON public.slot_holds (expires_at);

-- 3. RLS
ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

-- Users can view their own holds
DROP POLICY IF EXISTS "Users can view own holds" ON public.slot_holds;
CREATE POLICY "Users can view own holds" ON public.slot_holds
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can create their own holds
DROP POLICY IF EXISTS "Users can create holds" ON public.slot_holds;
CREATE POLICY "Users can create holds" ON public.slot_holds
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can delete their own holds (cleanup after booking)
DROP POLICY IF EXISTS "Users can delete own holds" ON public.slot_holds;
CREATE POLICY "Users can delete own holds" ON public.slot_holds
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Grant
GRANT SELECT, INSERT, DELETE ON public.slot_holds TO authenticated;

-- 4. reserve_slot_v1 RPC
-- Atomically creates a hold if the slot is available and not already held.
CREATE OR REPLACE FUNCTION public.reserve_slot_v1(
    p_salon_id            UUID,
    p_service_id          UUID,
    p_booking_date        DATE,
    p_time_slot           TEXT,
    p_user_id             UUID,
    p_hold_duration_seconds INTEGER DEFAULT 90
) RETURNS JSON AS $$
DECLARE
    v_allow_multiple  BOOLEAN;
    v_max_bookings    INTEGER;
    v_current_count   INTEGER;
    v_hold_count      INTEGER;
    v_hold_id         UUID;
    v_expires_at      TIMESTAMPTZ;
    v_normalized_slot TEXT;
BEGIN
    -- Normalize time_slot to HH:MM (strip seconds if present)
    v_normalized_slot := LEFT(p_time_slot, 5);

    -- Lock salon row to prevent concurrent races
    SELECT allow_multiple_bookings_per_slot, COALESCE(max_bookings_per_slot, 1)
      INTO v_allow_multiple, v_max_bookings
      FROM public.salons
     WHERE id = p_salon_id
     FOR SHARE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'SALON_NOT_FOUND', 'message', 'Salon not found');
    END IF;

    -- Count existing confirmed/pending bookings for this slot
    SELECT COUNT(*) INTO v_current_count
      FROM public.bookings
     WHERE salon_id    = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND status <> 'cancelled';

    -- Count active holds for this slot (not owned by this user)
    SELECT COUNT(*) INTO v_hold_count
      FROM public.slot_holds
     WHERE salon_id    = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND user_id    <> p_user_id
       AND expires_at  > NOW();

    -- Capacity check
    IF NOT v_allow_multiple THEN
        IF v_current_count > 0 OR v_hold_count > 0 THEN
            RETURN json_build_object(
                'success', false,
                'error_code', 'SLOT_TAKEN',
                'message', 'This slot is already booked or held by another user'
            );
        END IF;
    ELSE
        IF (v_current_count + v_hold_count) >= v_max_bookings THEN
            RETURN json_build_object(
                'success', false,
                'error_code', 'SLOT_FULL',
                'message', 'This slot has reached maximum capacity'
            );
        END IF;
    END IF;

    -- Remove any expired hold this user had for this slot (idempotent cleanup)
    DELETE FROM public.slot_holds
     WHERE salon_id    = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND user_id    = p_user_id;

    -- Create the hold
    v_expires_at := NOW() + (p_hold_duration_seconds * INTERVAL '1 second');

    INSERT INTO public.slot_holds (salon_id, service_id, booking_date, time_slot, user_id, expires_at)
    VALUES (p_salon_id, p_service_id, p_booking_date, v_normalized_slot, p_user_id, v_expires_at)
    RETURNING id INTO v_hold_id;

    RETURN json_build_object(
        'success', true,
        'hold_id', v_hold_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.reserve_slot_v1(UUID, UUID, DATE, TEXT, UUID, INTEGER) TO authenticated;

-- 5. Cleanup function for expired holds (call periodically or via pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.slot_holds WHERE expires_at <= NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_holds() TO authenticated;

SELECT '✅ 22 - slot_holds table and reserve_slot_v1 RPC created successfully!' AS status;
