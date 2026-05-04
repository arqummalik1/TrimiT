-- ✅ PHASE 2.1 DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify staff selection system

-- ==========================================
-- 1. CHECK TABLES EXIST
-- ==========================================
SELECT 
    'Tables Check' as test_name,
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
-- 2. CHECK COLUMNS ADDED TO BOOKINGS
-- ==========================================
SELECT 
    'Bookings Columns' as test_name,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as columns_found,
    '2 expected (staff_id, any_staff)' as expected
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('staff_id', 'any_staff');

-- ==========================================
-- 3. CHECK RPC FUNCTIONS
-- ==========================================
SELECT 
    'RPC Functions' as test_name,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as functions_found,
    '3 expected' as expected
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'check_staff_availability',
    'get_available_staff',
    'update_staff_rating'
);

-- ==========================================
-- 4. CHECK SAMPLE DATA
-- ==========================================
SELECT 
    'Sample Staff Data' as test_name,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as staff_count,
    '3+ expected' as expected
FROM staff;

-- ==========================================
-- 5. LIST ALL STAFF (DETAILED)
-- ==========================================
SELECT 
    '--- STAFF DETAILS ---' as section,
    id,
    name,
    average_rating,
    total_reviews,
    total_bookings,
    is_active
FROM staff
ORDER BY average_rating DESC;

-- ==========================================
-- 6. CHECK STAFF SERVICES MAPPING
-- ==========================================
SELECT 
    'Staff Services Mapping' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as mappings_found,
    '1+ expected' as expected
FROM staff_services;

-- ==========================================
-- 7. TEST STAFF AVAILABILITY FUNCTION
-- ==========================================
-- This tests if the function works (should return boolean)
SELECT 
    'Availability Function Test' as test_name,
    CASE 
        WHEN check_staff_availability(
            (SELECT id FROM staff LIMIT 1),
            (SELECT id FROM services LIMIT 1),
            (CURRENT_DATE + INTERVAL '1 day')::DATE,
            '14:00:00'::TIME,
            30
        ) IS NOT NULL THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    'Function executed successfully' as result;

-- ==========================================
-- 8. TEST GET AVAILABLE STAFF FUNCTION
-- ==========================================
SELECT 
    'Get Available Staff Test' as test_name,
    '✅ PASS' as status,
    COUNT(*) as available_staff_count
FROM get_available_staff(
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    (CURRENT_DATE + INTERVAL '1 day')::DATE,
    '14:00:00'::TIME
);

-- ==========================================
-- 9. CHECK STAFF PERFORMANCE VIEW
-- ==========================================
SELECT 
    'Staff Performance View' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status,
    COUNT(*) as records_found
FROM staff_performance;

-- ==========================================
-- 10. FINAL SUMMARY
-- ==========================================
SELECT 
    '========================================' as separator,
    '✅ ALL CHECKS COMPLETE!' as message,
    'If all tests show ✅ PASS, your database is ready!' as next_step;
