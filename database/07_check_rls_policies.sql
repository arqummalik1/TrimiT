-- ==========================================
-- CHECK AND FIX RLS POLICIES FOR BOOKINGS
-- ==========================================
-- Run this in Supabase SQL Editor to check RLS policies

-- Check if RLS is enabled on bookings table
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'bookings';

-- Check RLS policies on bookings table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings';

-- ==========================================
-- IF RLS IS BLOCKING REALTIME, FIX IT:
-- ==========================================

-- Enable RLS on bookings (if not already enabled)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing owner policy if it exists
DROP POLICY IF EXISTS "Owners can view their salon bookings" ON bookings;
DROP POLICY IF EXISTS "Owners can update their salon bookings" ON bookings;

-- Create policy for owners to view their salon's bookings
CREATE POLICY "Owners can view their salon bookings"
  ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = bookings.salon_id
      AND salons.owner_id = auth.uid()
    )
  );

-- Create policy for owners to update their salon's bookings
CREATE POLICY "Owners can update their salon bookings"
  ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM salons
      WHERE salons.id = bookings.salon_id
      AND salons.owner_id = auth.uid()
    )
  );

-- Ensure customers can view their own bookings
DROP POLICY IF EXISTS "Customers can view their bookings" ON bookings;
CREATE POLICY "Customers can view their bookings"
  ON bookings
  FOR SELECT
  USING (user_id = auth.uid());

-- ==========================================
-- VERIFY POLICIES
-- ==========================================

-- List all policies again
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings';
