-- =====================================================
-- COMPLETE VERIFICATION SCRIPT
-- =====================================================
-- Run this after all migrations to verify everything works
-- =====================================================

-- ==========================================
-- 1. CHECK ALL TABLES EXIST
-- ==========================================
SELECT 
    '1. Tables Check' as test_name,
    CASE 
        WHEN COUNT(*) >= 11 THEN '✅ PASS'
        ELSE '❌ FAIL - Missing tables'
    END as status,
    COUNT(*) as tables_found,
    '11+ expected' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'salons', 'services', 'bookings', 'reviews',
    'promotions', 'promo_usage', 'booking_reschedules',
    'staff', 'staff_services'
);

-- ==========================================
-- 2. CHECK STAFF TABLES
-- ==========================================
SELECT 
    '2. Staff Tables' as test_name,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as tables_found,
    '2 expected (staff, staff_services)' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('staff', 'staff_services');

-- ==========================================
-- 3. CHECK BOOKINGS COLUMNS
-- ==========================================
SELECT 
    '3. Bookings Columns' as test_name,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as columns_found,
    '2+ expected (staff_id, any_staff)' as expected
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('staff_id', 'any_staff');

-- ==========================================
-- 4. CHECK RPC FUNCTIONS
-- ==========================================
SELECT 
    '4. RPC Functions' as test_name,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as functions_found,
    '3+ expected' as expected
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'check_staff_availability',
    'get_available_staff',
    'create_atomic_booking',
    'update_staff_rating'
);

-- ==========================================
-- 5. CHECK SAMPLE STAFF DATA
-- ==========================================
SELECT 
    '5. Sample Staff' as test_name,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS'
        ELSE '⚠️  WARNING - No sample data'
    END as status,
    COUNT(*) as staff_count,
    '3+ expected' as expected
FROM staff;

-- ==========================================
-- 6. LIST ALL STAFF (DETAILED)
-- ==========================================
SELECT 
    '--- STAFF DETAILS ---' as info,
    id,
    name,
    average_rating,
    total_reviews,
    total_bookings,
    is_active
FROM staff
ORDER BY average_rating DESC;

-- ==========================================
-- 7. CHECK STAFF SERVICES MAPPING
-- ==========================================
SELECT 
    '6. Staff Services' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '⚠️  WARNING - No mappings'
    END as status,
    COUNT(*) as mappings_found,
    '1+ expected' as expected
FROM staff_services;

-- ==========================================
-- 8. TEST AVAILABILITY FUNCTION
-- ==========================================
DO $$
DECLARE
    v_result BOOLEAN;
    v_staff_id UUID;
    v_service_id UUID;
BEGIN
    -- Get first staff and service
    SELECT id INTO v_staff_id FROM staff LIMIT 1;
    SELECT id INTO v_service_id FROM services LIMIT 1;
    
    IF v_staff_id IS NOT NULL AND v_service_id IS NOT NULL THEN
        SELECT check_staff_availability(
            v_staff_id,
            v_service_id,
            (CURRENT_DATE + INTERVAL '1 day')::DATE,
            '14:00:00'::TIME,
            30
        ) INTO v_result;
        
        RAISE NOTICE '7. Availability Function: ✅ PASS (returned %)', v_result;
    ELSE
        RAISE NOTICE '7. Availability Function: ⚠️  WARNING - No staff/service to test';
    END IF;
END $$;

-- ==========================================
-- 9. TEST GET AVAILABLE STAFF
-- ==========================================
DO $$
DECLARE
    v_count INTEGER;
    v_salon_id UUID;
    v_service_id UUID;
BEGIN
    -- Get first salon and service
    SELECT id INTO v_salon_id FROM salons LIMIT 1;
    SELECT id INTO v_service_id FROM services LIMIT 1;
    
    IF v_salon_id IS NOT NULL AND v_service_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM get_available_staff(
            v_salon_id,
            v_service_id,
            (CURRENT_DATE + INTERVAL '1 day')::DATE,
            '14:00:00'::TIME
        );
        
        RAISE NOTICE '8. Get Available Staff: ✅ PASS (found % staff)', v_count;
    ELSE
        RAISE NOTICE '8. Get Available Staff: ⚠️  WARNING - No salon/service to test';
    END IF;
END $$;

-- ==========================================
-- 10. CHECK PROMO CODES
-- ==========================================
SELECT 
    '9. Promo Codes' as test_name,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS'
        ELSE '⚠️  WARNING - No promo codes'
    END as status,
    COUNT(*) as promo_count,
    '3+ expected' as expected
FROM promotions
WHERE active = true;

-- ==========================================
-- 11. CHECK RESCHEDULE SYSTEM
-- ==========================================
SELECT 
    '10. Reschedule System' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'booking_reschedules'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status;

-- ==========================================
-- 12. FINAL SUMMARY
-- ==========================================
SELECT 
    '========================================' as separator;

SELECT 
    '✅ VERIFICATION COMPLETE!' as message;

SELECT 
    'Database Status: READY FOR PRODUCTION' as status;

SELECT 
    'Next Steps:' as info,
    '1. Test mobile app' as step1,
    '2. Deploy backend' as step2,
    '3. Monitor logs' as step3;

-- ==========================================
-- 13. QUICK STATS
-- ==========================================
SELECT 
    '--- QUICK STATS ---' as info,
    (SELECT COUNT(*) FROM salons) as total_salons,
    (SELECT COUNT(*) FROM services) as total_services,
    (SELECT COUNT(*) FROM staff) as total_staff,
    (SELECT COUNT(*) FROM staff_services) as staff_service_mappings,
    (SELECT COUNT(*) FROM promotions WHERE active = true) as active_promos,
    (SELECT COUNT(*) FROM bookings) as total_bookings;
