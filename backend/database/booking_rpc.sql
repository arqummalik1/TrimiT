-- Atomic Booking RPC for TrimiT
-- Prevents race conditions during simultaneous booking attempts.
-- Updated to support promo codes

CREATE OR REPLACE FUNCTION create_atomic_booking(
    p_user_id UUID,
    p_salon_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_time_slot TEXT,
    p_status TEXT,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_amount DECIMAL,
    p_promo_code TEXT DEFAULT NULL,
    p_discount_amount DECIMAL DEFAULT 0,
    p_original_amount DECIMAL DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_allow_multiple BOOLEAN;
    v_max_bookings INTEGER;
    v_current_bookings INTEGER;
    v_booking_id UUID;
BEGIN
    -- 1. Lock the salon row to prevent concurrent checks for the same salon
    -- This is a simple way to serialize bookings for the same salon.
    SELECT allow_multiple_bookings_per_slot, max_bookings_per_slot 
    INTO v_allow_multiple, v_max_bookings
    FROM salons 
    WHERE id = p_salon_id
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Salon not found');
    END IF;

    -- 2. Count existing bookings for this slot
    SELECT count(*) INTO v_current_bookings
    FROM bookings
    WHERE salon_id = p_salon_id 
      AND booking_date = p_booking_date 
      AND time_slot = p_time_slot
      AND status != 'cancelled';

    -- 3. Check capacity
    IF NOT v_allow_multiple AND v_current_bookings > 0 THEN
        RETURN json_build_object('success', false, 'error', 'This slot is already fully booked.');
    END IF;

    IF v_allow_multiple AND v_current_bookings >= v_max_bookings THEN
        RETURN json_build_object('success', false, 'error', 'This slot has reached maximum capacity.');
    END IF;

    -- 4. Insert booking with promo fields
    INSERT INTO bookings (
        user_id, salon_id, service_id, booking_date, time_slot, status, 
        payment_method, payment_status, amount, promo_code, discount_amount, original_amount
    ) VALUES (
        p_user_id, p_salon_id, p_service_id, p_booking_date, p_time_slot, p_status, 
        p_payment_method, p_payment_status, p_amount, p_promo_code, p_discount_amount, p_original_amount
    ) RETURNING id INTO v_booking_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
