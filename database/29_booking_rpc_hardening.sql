-- 29: Harden create_atomic_booking (auth.uid, holds, amount) + reserve_slot_v1 FOR UPDATE
-- Apply after 27. Do not edit 27 in place.

-- ─── reserve_slot_v1: FOR SHARE → FOR UPDATE ───────────────────────────────
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
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authenticated');
    END IF;
    IF auth.uid() <> p_user_id THEN
        RETURN json_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'Forbidden');
    END IF;

    v_normalized_slot := LEFT(p_time_slot, 5);

    SELECT allow_multiple_bookings_per_slot, COALESCE(max_bookings_per_slot, 1)
      INTO v_allow_multiple, v_max_bookings
      FROM public.salons
     WHERE id = p_salon_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_code', 'SALON_NOT_FOUND', 'message', 'Salon not found');
    END IF;

    SELECT COUNT(*) INTO v_current_count
      FROM public.bookings
     WHERE salon_id = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND status <> 'cancelled';

    SELECT COUNT(*) INTO v_hold_count
      FROM public.slot_holds
     WHERE salon_id = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND user_id <> p_user_id
       AND expires_at > NOW();

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

    DELETE FROM public.slot_holds
     WHERE salon_id = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND user_id = p_user_id;

    v_expires_at := NOW() + (p_hold_duration_seconds || ' seconds')::INTERVAL;

    INSERT INTO public.slot_holds (
        salon_id, service_id, booking_date, time_slot, user_id, expires_at
    ) VALUES (
        p_salon_id, p_service_id, p_booking_date, v_normalized_slot, p_user_id, v_expires_at
    )
    RETURNING id INTO v_hold_id;

    RETURN json_build_object(
        'success', true,
        'hold_id', v_hold_id,
        'expires_at', v_expires_at
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error_code', 'SLOT_TAKEN',
            'message', 'This slot is already held'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── create_atomic_booking: auth, holds, server-side amount ─────────────────
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
    v_allow_multiple     BOOLEAN;
    v_max_bookings       INTEGER;
    v_current_bookings   INTEGER;
    v_hold_others        INTEGER;
    v_has_own_hold       BOOLEAN;
    v_booking_id         UUID;
    v_normalized_slot    TEXT;
    v_service_price      NUMERIC;
    v_final_amount       NUMERIC;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    IF auth.uid() <> p_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Forbidden');
    END IF;

    v_normalized_slot := LEFT(p_time_slot, 5);

    SELECT price INTO v_service_price
      FROM public.services
     WHERE id = p_service_id AND salon_id = p_salon_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Service not found');
    END IF;

    v_final_amount := GREATEST(v_service_price - COALESCE(p_discount_amount, 0), 0);

    SELECT allow_multiple_bookings_per_slot, COALESCE(max_bookings_per_slot, 1)
      INTO v_allow_multiple, v_max_bookings
      FROM public.salons
     WHERE id = p_salon_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Salon not found');
    END IF;

    SELECT COUNT(*) INTO v_current_bookings
      FROM public.bookings
     WHERE salon_id = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND status <> 'cancelled';

    SELECT COUNT(*) INTO v_hold_others
      FROM public.slot_holds
     WHERE salon_id = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND user_id <> p_user_id
       AND expires_at > NOW();

    SELECT EXISTS (
        SELECT 1 FROM public.slot_holds
         WHERE salon_id = p_salon_id
           AND booking_date = p_booking_date
           AND LEFT(time_slot, 5) = v_normalized_slot
           AND user_id = p_user_id
           AND expires_at > NOW()
    ) INTO v_has_own_hold;

    IF NOT v_allow_multiple AND NOT v_has_own_hold THEN
        RETURN json_build_object(
            'success', false,
            'error', 'A valid slot reservation is required before booking'
        );
    END IF;

    v_current_bookings := v_current_bookings + v_hold_others;

    IF NOT v_allow_multiple AND v_current_bookings > 0 THEN
        RETURN json_build_object('success', false, 'error', 'This slot is already fully booked.');
    END IF;

    IF v_allow_multiple AND (v_current_bookings >= v_max_bookings) THEN
        RETURN json_build_object('success', false, 'error', 'This slot has reached maximum capacity.');
    END IF;

    INSERT INTO public.bookings (
        user_id, salon_id, service_id, booking_date, time_slot,
        status, payment_method, payment_status, amount,
        promo_code, discount_amount, original_amount
    ) VALUES (
        p_user_id, p_salon_id, p_service_id, p_booking_date, v_normalized_slot,
        p_status, p_payment_method, p_payment_status, v_final_amount,
        p_promo_code, COALESCE(p_discount_amount, 0), COALESCE(p_original_amount, v_service_price)
    )
    RETURNING id INTO v_booking_id;

    DELETE FROM public.slot_holds
     WHERE salon_id = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND user_id = p_user_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'amount', v_final_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.create_atomic_booking(
    UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.reserve_slot_v1(
    UUID, UUID, DATE, TEXT, UUID, INTEGER
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_atomic_booking(
    UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_slot_v1(
    UUID, UUID, DATE, TEXT, UUID, INTEGER
) TO authenticated;

SELECT 'Migration 29 applied: RPC hardening + reserve FOR UPDATE' AS status;
