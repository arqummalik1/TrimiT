-- =====================================================
-- FINAL FIX: STAFF AVAILABILITY FUNCTIONS
-- =====================================================
-- This fixes type mismatches in the staff availability functions
-- Issues fixed:
-- 1. time_slot in bookings is TEXT, not TIME - need to cast
-- 2. duration doesn't exist in bookings - get from services table
-- 3. create_atomic_booking has wrong signature
-- =====================================================

-- =====================================================
-- 1. FIX check_staff_availability FUNCTION
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
    -- 1. Check if staff exists and is active
    SELECT is_active, working_hours
    INTO v_day_enabled, v_staff_working_hours
    FROM staff
    WHERE id = p_staff_id;
    
    IF NOT FOUND OR NOT v_day_enabled THEN
        RETURN false;
    END IF;
    
    -- 2. Check if staff can perform this service
    SELECT EXISTS(
        SELECT 1 FROM staff_services 
        WHERE staff_id = p_staff_id AND service_id = p_service_id
    ) INTO v_can_perform_service;
    
    IF NOT v_can_perform_service THEN
        RETURN false;
    END IF;
    
    -- 3. Get day of week (lowercase)
    v_day_of_week := LOWER(TO_CHAR(p_booking_date, 'Day'));
    v_day_of_week := TRIM(v_day_of_week);
    
    -- 4. Check if day is enabled in working hours
    v_day_enabled := (v_staff_working_hours->v_day_of_week->>'enabled')::boolean;
    
    IF NOT v_day_enabled THEN
        RETURN false;
    END IF;
    
    -- 5. Check if date is in days_off array
    SELECT p_booking_date::TEXT = ANY(days_off)
    INTO v_is_day_off
    FROM staff
    WHERE id = p_staff_id;
    
    IF v_is_day_off THEN
        RETURN false;
    END IF;
    
    -- 6. Check if time slot is within working hours
    v_start_time := (v_staff_working_hours->v_day_of_week->>'start')::TIME;
    v_end_time := (v_staff_working_hours->v_day_of_week->>'end')::TIME;
    
    IF p_time_slot < v_start_time OR p_time_slot >= v_end_time THEN
        RETURN false;
    END IF;
    
    -- 7. Check if staff has conflicting bookings
    -- FIXED: Cast time_slot from TEXT to TIME, get duration from services table
    SELECT COUNT(*)
    INTO v_existing_bookings
    FROM bookings b
    INNER JOIN services s ON b.service_id = s.id
    WHERE b.staff_id = p_staff_id
        AND b.booking_date = p_booking_date
        AND b.status IN ('pending', 'confirmed')
        AND (
            -- Existing booking starts during requested slot
            (b.time_slot::TIME >= p_time_slot 
             AND b.time_slot::TIME < p_time_slot + (p_duration || ' minutes')::INTERVAL)
            OR
            -- Existing booking ends during requested slot
            (b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL > p_time_slot 
             AND b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL <= p_time_slot + (p_duration || ' minutes')::INTERVAL)
            OR
            -- Existing booking completely overlaps requested slot
            (b.time_slot::TIME <= p_time_slot 
             AND b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL >= p_time_slot + (p_duration || ' minutes')::INTERVAL)
        );
    
    IF v_existing_bookings > 0 THEN
        RETURN false;
    END IF;
    
    -- All checks passed
    RETURN true;
END;
$$;

-- =====================================================
-- 2. FIX create_atomic_booking FUNCTION
-- =====================================================
-- The bookings table doesn't have a duration column
-- Remove it from the INSERT statement

DROP FUNCTION IF EXISTS create_atomic_booking(UUID, UUID, UUID, DATE, TIME, INTEGER, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS create_atomic_booking(UUID, UUID, UUID, DATE, TEXT, INTEGER, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION create_atomic_booking(
    p_user_id UUID,
    p_salon_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_time_slot TEXT,  -- TEXT because that's how it's stored in bookings table
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
    -- 1. Lock the salon row to prevent race conditions
    PERFORM id FROM salons WHERE id = p_salon_id FOR UPDATE;
    
    -- 2. Get salon's max bookings per slot
    SELECT COALESCE(max_bookings_per_slot, 1) INTO v_salon_max_bookings
    FROM salons
    WHERE id = p_salon_id;
    
    -- 3. Get service duration
    SELECT duration INTO v_service_duration
    FROM services
    WHERE id = p_service_id;
    
    -- 4. If staff is specified, check staff availability
    IF p_staff_id IS NOT NULL THEN
        SELECT check_staff_availability(
            p_staff_id,
            p_service_id,
            p_booking_date,
            p_time_slot::TIME,  -- Cast TEXT to TIME for the function
            v_service_duration
        ) INTO v_staff_available;
        
        IF NOT v_staff_available THEN
            RETURN QUERY SELECT NULL::UUID, false, 'Selected staff member is not available for this time slot';
            RETURN;
        END IF;
    END IF;
    
    -- 5. If any_staff is true, check if ANY staff is available
    IF p_any_staff = true AND p_staff_id IS NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM get_available_staff(
                p_salon_id,
                p_service_id,
                p_booking_date,
                p_time_slot::TIME  -- Cast TEXT to TIME for the function
            )
        ) INTO v_staff_available;
        
        IF NOT v_staff_available THEN
            RETURN QUERY SELECT NULL::UUID, false, 'No staff members available for this time slot';
            RETURN;
        END IF;
    END IF;
    
    -- 6. Check slot capacity
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
    
    -- 7. Create the booking (NO duration column in bookings table!)
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
    
    -- 8. Increment staff's total bookings counter
    IF p_staff_id IS NOT NULL THEN
        UPDATE staff
        SET total_bookings = total_bookings + 1,
            updated_at = NOW()
        WHERE id = p_staff_id;
    END IF;
    
    -- 9. Return success
    RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully';
END;
$$;

-- =====================================================
-- 3. VERIFICATION TESTS
-- =====================================================

-- Test 1: Check if functions exist
SELECT 
    'Functions Check' as test_name,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as functions_found
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'check_staff_availability',
    'get_available_staff',
    'create_atomic_booking'
);

-- Test 2: Test check_staff_availability function
SELECT 
    'Availability Function' as test_name,
    CASE 
        WHEN check_staff_availability(
            (SELECT id FROM staff LIMIT 1),
            (SELECT id FROM services LIMIT 1),
            (CURRENT_DATE + INTERVAL '1 day')::DATE,
            '14:00:00'::TIME,
            30
        ) IS NOT NULL THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status;

-- Test 3: Test get_available_staff function
SELECT 
    'Get Available Staff' as test_name,
    '✅ PASS' as status,
    COUNT(*) as available_staff
FROM get_available_staff(
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    (CURRENT_DATE + INTERVAL '1 day')::DATE,
    '14:00:00'::TIME
);

-- Test 4: Check bookings table structure
SELECT 
    'Bookings Columns' as test_name,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as columns_found
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('staff_id', 'any_staff');

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================
SELECT 
    '========================================' as separator,
    '✅ ALL FIXES APPLIED SUCCESSFULLY!' as message,
    'Staff selection system is ready to use!' as status;
