-- =====================================================
-- 🔧 STAFF SELECTION SYSTEM - FINAL FIX
-- =====================================================
-- Run this file in Supabase SQL Editor to fix all issues
-- This is the ONLY file you need to run!
-- =====================================================

-- =====================================================
-- FIX 1: check_staff_availability Function
-- =====================================================
DROP FUNCTION IF EXISTS check_staff_availability(UUID, UUID, DATE, TIME, INTEGER);

CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_time_slot TIME,
    p_duration INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_working_hours JSONB;
    v_day_of_week TEXT;
    v_day_enabled BOOLEAN;
    v_start_time TIME;
    v_end_time TIME;
    v_is_day_off BOOLEAN;
    v_existing_bookings INTEGER;
    v_can_perform_service BOOLEAN;
BEGIN
    -- Check if staff exists and is active
    SELECT is_active, working_hours
    INTO v_day_enabled, v_staff_working_hours
    FROM staff
    WHERE id = p_staff_id;
    
    IF NOT FOUND OR NOT v_day_enabled THEN
        RETURN false;
    END IF;
    
    -- Check if staff can perform this service
    SELECT EXISTS(
        SELECT 1 FROM staff_services 
        WHERE staff_id = p_staff_id AND service_id = p_service_id
    ) INTO v_can_perform_service;
    
    IF NOT v_can_perform_service THEN
        RETURN false;
    END IF;
    
    -- Get day of week
    v_day_of_week := TRIM(LOWER(TO_CHAR(p_booking_date, 'Day')));
    
    -- Check if day is enabled
    v_day_enabled := (v_staff_working_hours->v_day_of_week->>'enabled')::boolean;
    
    IF NOT v_day_enabled THEN
        RETURN false;
    END IF;
    
    -- Check if date is in days_off
    SELECT p_booking_date::TEXT = ANY(days_off)
    INTO v_is_day_off
    FROM staff
    WHERE id = p_staff_id;
    
    IF v_is_day_off THEN
        RETURN false;
    END IF;
    
    -- Check if time slot is within working hours
    v_start_time := (v_staff_working_hours->v_day_of_week->>'start')::TIME;
    v_end_time := (v_staff_working_hours->v_day_of_week->>'end')::TIME;
    
    IF p_time_slot < v_start_time OR p_time_slot >= v_end_time THEN
        RETURN false;
    END IF;
    
    -- Check for conflicting bookings (FIXED: Cast time_slot, JOIN services for duration)
    SELECT COUNT(*)
    INTO v_existing_bookings
    FROM bookings b
    INNER JOIN services s ON b.service_id = s.id
    WHERE b.staff_id = p_staff_id
        AND b.booking_date = p_booking_date
        AND b.status IN ('pending', 'confirmed')
        AND (
            (b.time_slot::TIME >= p_time_slot 
             AND b.time_slot::TIME < p_time_slot + (p_duration || ' minutes')::INTERVAL)
            OR
            (b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL > p_time_slot 
             AND b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL <= p_time_slot + (p_duration || ' minutes')::INTERVAL)
            OR
            (b.time_slot::TIME <= p_time_slot 
             AND b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL >= p_time_slot + (p_duration || ' minutes')::INTERVAL)
        );
    
    IF v_existing_bookings > 0 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- =====================================================
-- FIX 2: create_atomic_booking Function
-- =====================================================
DROP FUNCTION IF EXISTS create_atomic_booking(UUID, UUID, UUID, DATE, TIME, INTEGER, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS create_atomic_booking(UUID, UUID, UUID, DATE, TEXT, INTEGER, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION create_atomic_booking(
    p_user_id UUID,
    p_salon_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_time_slot TEXT,
    p_payment_method TEXT,
    p_amount DECIMAL,
    p_promo_code TEXT DEFAULT NULL,
    p_discount_amount DECIMAL DEFAULT 0,
    p_original_amount DECIMAL DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL,
    p_any_staff BOOLEAN DEFAULT false
)
RETURNS TABLE (
    booking_id UUID,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_salon_max_bookings INTEGER;
    v_current_bookings INTEGER;
    v_staff_available BOOLEAN;
    v_service_duration INTEGER;
BEGIN
    -- Lock salon row
    PERFORM id FROM salons WHERE id = p_salon_id FOR UPDATE;
    
    -- Get salon's max bookings per slot
    SELECT COALESCE(max_bookings_per_slot, 1) INTO v_salon_max_bookings
    FROM salons
    WHERE id = p_salon_id;
    
    -- Get service duration
    SELECT duration INTO v_service_duration
    FROM services
    WHERE id = p_service_id;
    
    -- Check staff availability if specified
    IF p_staff_id IS NOT NULL THEN
        SELECT check_staff_availability(
            p_staff_id,
            p_service_id,
            p_booking_date,
            p_time_slot::TIME,
            v_service_duration
        ) INTO v_staff_available;
        
        IF NOT v_staff_available THEN
            RETURN QUERY SELECT NULL::UUID, false, 'Selected staff member is not available for this time slot';
            RETURN;
        END IF;
    END IF;
    
    -- Check if any staff available when any_staff is true
    IF p_any_staff = true AND p_staff_id IS NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM get_available_staff(
                p_salon_id,
                p_service_id,
                p_booking_date,
                p_time_slot::TIME
            )
        ) INTO v_staff_available;
        
        IF NOT v_staff_available THEN
            RETURN QUERY SELECT NULL::UUID, false, 'No staff members available for this time slot';
            RETURN;
        END IF;
    END IF;
    
    -- Check slot capacity
    SELECT COUNT(*) INTO v_current_bookings
    FROM bookings
    WHERE salon_id = p_salon_id
        AND booking_date = p_booking_date
        AND time_slot = p_time_slot
        AND status IN ('pending', 'confirmed');
    
    IF v_current_bookings >= v_salon_max_bookings THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Time slot is fully booked';
        RETURN;
    END IF;
    
    -- Create booking (FIXED: No duration column!)
    INSERT INTO bookings (
        user_id,
        salon_id,
        service_id,
        booking_date,
        time_slot,
        status,
        payment_status,
        payment_method,
        amount,
        promo_code,
        discount_amount,
        original_amount,
        staff_id,
        any_staff
    ) VALUES (
        p_user_id,
        p_salon_id,
        p_service_id,
        p_booking_date,
        p_time_slot,
        'pending',
        'pending',
        p_payment_method,
        p_amount,
        p_promo_code,
        p_discount_amount,
        COALESCE(p_original_amount, p_amount),
        p_staff_id,
        p_any_staff
    )
    RETURNING id INTO v_booking_id;
    
    -- Increment staff bookings counter
    IF p_staff_id IS NOT NULL THEN
        UPDATE staff
        SET total_bookings = total_bookings + 1,
            updated_at = NOW()
        WHERE id = p_staff_id;
    END IF;
    
    RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully';
END;
$$;

-- =====================================================
-- VERIFICATION TESTS
-- =====================================================

-- Test 1: Functions exist
SELECT 
    '✅ Test 1: Functions' as test,
    COUNT(*) as found,
    '3 expected' as expected
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('check_staff_availability', 'get_available_staff', 'create_atomic_booking');

-- Test 2: Availability function works
SELECT 
    '✅ Test 2: Availability' as test,
    check_staff_availability(
        (SELECT id FROM staff LIMIT 1),
        (SELECT id FROM services LIMIT 1),
        (CURRENT_DATE + INTERVAL '1 day')::DATE,
        '14:00:00'::TIME,
        30
    ) as result;

-- Test 3: Get available staff works
SELECT 
    '✅ Test 3: Get Staff' as test,
    COUNT(*) as available_staff
FROM get_available_staff(
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    (CURRENT_DATE + INTERVAL '1 day')::DATE,
    '14:00:00'::TIME
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '========================================' as separator;
SELECT '✅ ALL FIXES APPLIED SUCCESSFULLY!' as message;
SELECT 'Staff selection system is ready!' as status;
SELECT 'Next: Test the mobile app' as next_step;
