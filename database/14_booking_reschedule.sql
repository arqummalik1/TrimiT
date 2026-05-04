-- ============================================================================
-- Booking Reschedule Feature
-- ============================================================================
-- This migration adds support for one-click booking rescheduling with:
-- - Atomic slot swap operations
-- - Reschedule history tracking
-- - Permission validation
-- - Audit trail
-- ============================================================================

-- 1. Create reschedule history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_reschedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_date DATE NOT NULL,
  old_time_slot VARCHAR(10) NOT NULL,
  new_date DATE NOT NULL,
  new_time_slot VARCHAR(10) NOT NULL,
  initiated_by UUID REFERENCES auth.users(id),
  initiated_by_role VARCHAR(20) CHECK (initiated_by_role IN ('customer', 'owner')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_reschedules_booking_id 
  ON booking_reschedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reschedules_created_at 
  ON booking_reschedules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_reschedules_initiated_by 
  ON booking_reschedules(initiated_by);

-- 2. Add reschedule metadata to bookings table
-- ============================================================================
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_date DATE,
ADD COLUMN IF NOT EXISTS original_time_slot VARCHAR(10);

-- Populate original values for existing bookings
UPDATE bookings 
SET original_date = booking_date,
    original_time_slot = time_slot
WHERE original_date IS NULL;

-- 3. RLS Policies for booking_reschedules
-- ============================================================================
ALTER TABLE booking_reschedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reschedule history" ON booking_reschedules;
DROP POLICY IF EXISTS "Owners can view salon reschedule history" ON booking_reschedules;
DROP POLICY IF EXISTS "Users can insert reschedule records" ON booking_reschedules;

-- Customers can view their own reschedule history
CREATE POLICY "Users can view own reschedule history"
  ON booking_reschedules FOR SELECT
  USING (
    initiated_by = auth.uid()
    OR booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Owners can view reschedules for their salon bookings
CREATE POLICY "Owners can view salon reschedule history"
  ON booking_reschedules FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN salons s ON b.salon_id = s.id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Allow authenticated users to insert reschedule records
-- (actual permission check is in the RPC function)
CREATE POLICY "Users can insert reschedule records"
  ON booking_reschedules FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Atomic Reschedule RPC Function
-- ============================================================================
CREATE OR REPLACE FUNCTION reschedule_booking_atomic(
  p_booking_id UUID,
  p_new_date DATE,
  p_new_time_slot VARCHAR(10),
  p_user_id UUID,
  p_user_role VARCHAR(20),
  p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_old_date DATE;
  v_old_time_slot VARCHAR(10);
  v_current_bookings INTEGER;
  v_max_bookings INTEGER;
  v_allow_multiple BOOLEAN;
  v_reschedule_count INTEGER;
BEGIN
  -- 1. Get current booking details with row lock (prevents concurrent modifications)
  SELECT 
    b.id, b.salon_id, b.service_id, b.booking_date, b.time_slot,
    b.status, b.user_id, COALESCE(b.reschedule_count, 0) as reschedule_count
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;  -- Exclusive lock on this row

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- 2. Validate booking status
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending or confirmed bookings can be rescheduled'
    );
  END IF;

  -- 3. Validate user permissions
  IF p_user_role = 'customer' AND v_booking.user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You can only reschedule your own bookings'
    );
  END IF;

  IF p_user_role = 'owner' THEN
    -- Verify owner owns the salon
    IF NOT EXISTS (
      SELECT 1 FROM salons 
      WHERE id = v_booking.salon_id AND owner_id = p_user_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'You can only reschedule bookings for your salon'
      );
    END IF;
  END IF;

  -- 4. Validate new slot is different
  IF v_booking.booking_date = p_new_date 
     AND v_booking.time_slot = p_new_time_slot THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New slot must be different from current slot'
    );
  END IF;

  -- 5. Validate new date is not in the past
  IF p_new_date < CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot reschedule to a past date'
    );
  END IF;

  -- 6. Check new slot availability
  SELECT 
    s.max_bookings_per_slot,
    s.allow_multiple_bookings_per_slot
  INTO v_max_bookings, v_allow_multiple
  FROM salons s
  WHERE s.id = v_booking.salon_id;

  -- Count current bookings for new slot (excluding this booking)
  SELECT COUNT(*)
  INTO v_current_bookings
  FROM bookings
  WHERE salon_id = v_booking.salon_id
    AND booking_date = p_new_date
    AND time_slot = p_new_time_slot
    AND status IN ('pending', 'confirmed')
    AND id != p_booking_id;

  -- Check if slot is available
  IF v_current_bookings >= v_max_bookings THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Selected time slot is not available'
    );
  END IF;

  -- 7. Store old values for audit trail
  v_old_date := v_booking.booking_date;
  v_old_time_slot := v_booking.time_slot;
  v_reschedule_count := v_booking.reschedule_count + 1;

  -- 8. Update booking (atomic operation within transaction)
  UPDATE bookings
  SET 
    booking_date = p_new_date,
    time_slot = p_new_time_slot,
    reschedule_count = v_reschedule_count,
    last_rescheduled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 9. Create reschedule audit record
  INSERT INTO booking_reschedules (
    booking_id,
    old_date,
    old_time_slot,
    new_date,
    new_time_slot,
    initiated_by,
    initiated_by_role,
    reason
  ) VALUES (
    p_booking_id,
    v_old_date,
    v_old_time_slot,
    p_new_date,
    p_new_time_slot,
    p_user_id,
    p_user_role,
    p_reason
  );

  -- 10. Return success with details
  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'old_date', v_old_date,
    'old_time_slot', v_old_time_slot,
    'new_date', p_new_date,
    'new_time_slot', p_new_time_slot,
    'reschedule_count', v_reschedule_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Catch any unexpected errors
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reschedule_booking_atomic TO authenticated;

-- 5. Helper function to get reschedule history
-- ============================================================================
CREATE OR REPLACE FUNCTION get_booking_reschedule_history(p_booking_id UUID)
RETURNS TABLE (
  id UUID,
  old_date DATE,
  old_time_slot VARCHAR(10),
  new_date DATE,
  new_time_slot VARCHAR(10),
  initiated_by_role VARCHAR(20),
  reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.old_date,
    br.old_time_slot,
    br.new_date,
    br.new_time_slot,
    br.initiated_by_role,
    br.reason,
    br.created_at
  FROM booking_reschedules br
  WHERE br.booking_id = p_booking_id
  ORDER BY br.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_booking_reschedule_history TO authenticated;

-- 6. Verification queries
-- ============================================================================
-- Verify tables exist
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('booking_reschedules', 'bookings')
ORDER BY table_name;

-- Verify new columns in bookings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND column_name IN ('reschedule_count', 'last_rescheduled_at', 'original_date', 'original_time_slot');

-- Verify RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('reschedule_booking_atomic', 'get_booking_reschedule_history');

-- Verify RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'booking_reschedules'
ORDER BY policyname;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Deploy backend API endpoint
-- 2. Implement mobile UI for rescheduling
-- 3. Add push notifications for reschedule events
-- 4. Test atomic operations under concurrent load
-- ============================================================================
