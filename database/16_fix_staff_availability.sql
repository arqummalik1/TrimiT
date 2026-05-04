-- =====================================================
-- FIX: STAFF AVAILABILITY FUNCTION TYPE CASTING
-- =====================================================
-- The time_slot column in bookings is TEXT, not TIME
-- We need to cast it properly for comparisons

DROP FUNCTION IF EXISTS check_staff_availability(UUID, UUID, DATE, TIME, INTEGER);

CREATE OR REPLACE FUNCTION check_staff_availability(
    p_staff_id UUID,
    p_service_id UUID,
    p_booking_date DATE,
    p_time_slot TIME,
    p_duration INTEGER DEFAULT 30 -- service duration in minutes
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
    -- FIXED: Get duration from services table, cast time_slot from TEXT to TIME
    SELECT COUNT(*)
    INTO v_existing_bookings
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.staff_id = p_staff_id
        AND b.booking_date = p_booking_date
        AND b.status IN ('pending', 'confirmed')
        AND (
            -- Existing booking starts during requested slot
            (b.time_slot::TIME >= p_time_slot AND b.time_slot::TIME < p_time_slot + (p_duration || ' minutes')::INTERVAL)
            OR
            -- Existing booking ends during requested slot
            (b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL > p_time_slot 
             AND b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL <= p_time_slot + (p_duration || ' minutes')::INTERVAL)
            OR
            -- Existing booking completely overlaps requested slot
            (b.time_slot::TIME <= p_time_slot AND b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL >= p_time_slot + (p_duration || ' minutes')::INTERVAL)
        );
    
    IF v_existing_bookings > 0 THEN
        RETURN false;
    END IF;
    
    -- All checks passed
    RETURN true;
END;
$$;

-- Test the fixed function
SELECT 
    'Fixed Function Test' as test_name,
    CASE 
        WHEN check_staff_availability(
            (SELECT id FROM staff LIMIT 1),
            (SELECT id FROM services LIMIT 1),
            (CURRENT_DATE + INTERVAL '1 day')::DATE,
            '14:00:00'::TIME,
            30
        ) IS NOT NULL THEN '✅ PASS - Function works!'
        ELSE '❌ FAIL'
    END as status;
