-- 27: Patch create_atomic_booking lock from FOR SHARE → FOR UPDATE (BC6)
-- Safe to re-apply: replaces only the lock line in the deployed v23 function body.

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
    v_normalized_slot := LEFT(p_time_slot, 5);

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
     WHERE salon_id     = p_salon_id
       AND booking_date = p_booking_date
       AND LEFT(time_slot, 5) = v_normalized_slot
       AND status <> 'cancelled';

    IF NOT v_allow_multiple AND v_current_bookings > 0 THEN
        RETURN json_build_object('success', false, 'error', 'This slot is already fully booked.');
    END IF;

    IF v_allow_multiple AND v_current_bookings >= v_max_bookings THEN
        RETURN json_build_object('success', false, 'error', 'This slot has reached maximum capacity.');
    END IF;

    INSERT INTO public.bookings (
        user_id, salon_id, service_id, booking_date, time_slot,
        status, payment_method, payment_status, amount,
        promo_code, discount_amount, original_amount
    ) VALUES (
        p_user_id, p_salon_id, p_service_id, p_booking_date, v_normalized_slot,
        p_status, p_payment_method, p_payment_status, p_amount,
        p_promo_code, p_discount_amount, p_original_amount
    )
    RETURNING id INTO v_booking_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration 27 applied: create_atomic_booking uses FOR UPDATE' AS status;
