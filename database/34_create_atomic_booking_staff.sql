-- 34: Staff-aware create_atomic_booking (CRIT-03) — extends migration 29

DROP FUNCTION IF EXISTS public.create_atomic_booking(
    UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC
);

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
    p_original_amount NUMERIC DEFAULT NULL,
    p_staff_id        UUID    DEFAULT NULL,
    p_any_staff       BOOLEAN DEFAULT FALSE
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
    v_staff_available    BOOLEAN;
    v_service_duration   INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    IF auth.uid() <> p_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Forbidden');
    END IF;

    v_normalized_slot := LEFT(p_time_slot, 5);

    SELECT price, duration INTO v_service_price, v_service_duration
      FROM public.services
     WHERE id = p_service_id AND salon_id = p_salon_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Service not found');
    END IF;

    v_final_amount := GREATEST(v_service_price - COALESCE(p_discount_amount, 0), 0);

    IF p_staff_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.staff
             WHERE id = p_staff_id AND salon_id = p_salon_id AND is_active = true
        ) THEN
            RETURN json_build_object('success', false, 'error', 'Invalid staff member');
        END IF;

        SELECT public.check_staff_availability(
            p_staff_id, p_service_id, p_booking_date, v_normalized_slot::TIME, v_service_duration
        ) INTO v_staff_available;

        IF NOT COALESCE(v_staff_available, false) THEN
            RETURN json_build_object('success', false, 'error', 'Selected staff is not available for this slot');
        END IF;
    ELSIF p_any_staff THEN
        SELECT EXISTS (
            SELECT 1 FROM public.get_available_staff(
                p_salon_id, p_service_id, p_booking_date, v_normalized_slot::TIME
            )
        ) INTO v_staff_available;
        IF NOT COALESCE(v_staff_available, false) THEN
            RETURN json_build_object('success', false, 'error', 'No staff available for this slot');
        END IF;
    END IF;

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
        RETURN json_build_object('success', false, 'error', 'A valid slot reservation is required before booking');
    END IF;

    v_current_bookings := v_current_bookings + v_hold_others;

    IF NOT v_allow_multiple AND v_current_bookings > 0 THEN
        RETURN json_build_object('success', false, 'error', 'This slot is already fully booked.');
    END IF;

    IF v_allow_multiple AND v_current_bookings >= v_max_bookings THEN
        RETURN json_build_object('success', false, 'error', 'This slot has reached maximum capacity.');
    END IF;

    INSERT INTO public.bookings (
        user_id, salon_id, service_id, booking_date, time_slot,
        status, payment_method, payment_status, amount,
        promo_code, discount_amount, original_amount, staff_id, any_staff
    ) VALUES (
        p_user_id, p_salon_id, p_service_id, p_booking_date, v_normalized_slot,
        p_status, p_payment_method, p_payment_status, v_final_amount,
        p_promo_code, COALESCE(p_discount_amount, 0), COALESCE(p_original_amount, v_service_price),
        p_staff_id, COALESCE(p_any_staff, false)
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
    UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC, UUID, BOOLEAN
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_atomic_booking(
    UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC, NUMERIC, UUID, BOOLEAN
) TO authenticated;

SELECT 'Migration 34 applied: staff-aware create_atomic_booking' AS status;
