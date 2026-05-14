-- ============================================================================
-- Reschedule: drop references to bookings.updated_at
-- ============================================================================
-- Some production projects never added `updated_at` on `public.bookings`
-- (schema drift vs 01_schema.sql). The RPC must not SET that column.
-- Safe to run even if 15 already ran — replaces the same function body.
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
  SELECT 
    b.id, b.salon_id, b.service_id, b.booking_date, b.time_slot,
    b.status, b.user_id, COALESCE(b.reschedule_count, 0) as reschedule_count
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending or confirmed bookings can be rescheduled'
    );
  END IF;

  IF p_user_role = 'customer' AND v_booking.user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You can only reschedule your own bookings'
    );
  END IF;

  IF p_user_role = 'owner' THEN
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

  IF v_booking.booking_date = p_new_date 
     AND (v_booking.time_slot::time) = (p_new_time_slot::time) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New slot must be different from current slot'
    );
  END IF;

  IF p_new_date < CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot reschedule to a past date'
    );
  END IF;

  SELECT 
    s.max_bookings_per_slot,
    s.allow_multiple_bookings_per_slot
  INTO v_max_bookings, v_allow_multiple
  FROM salons s
  WHERE s.id = v_booking.salon_id;

  SELECT COUNT(*)
  INTO v_current_bookings
  FROM bookings
  WHERE salon_id = v_booking.salon_id
    AND booking_date = p_new_date
    AND (time_slot::time) = (p_new_time_slot::time)
    AND status IN ('pending', 'confirmed')
    AND id != p_booking_id;

  IF v_current_bookings >= v_max_bookings THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Selected time slot is not available'
    );
  END IF;

  v_old_date := v_booking.booking_date;
  v_old_time_slot := v_booking.time_slot;
  v_reschedule_count := v_booking.reschedule_count + 1;

  UPDATE bookings
  SET 
    booking_date = p_new_date,
    time_slot = substring(trim(p_new_time_slot) from 1 for 5),
    reschedule_count = v_reschedule_count,
    last_rescheduled_at = NOW()
  WHERE id = p_booking_id;

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
    substring(trim(p_new_time_slot) from 1 for 5),
    p_user_id,
    p_user_role,
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'old_date', v_old_date,
    'old_time_slot', v_old_time_slot,
    'new_date', p_new_date,
    'new_time_slot', substring(trim(p_new_time_slot) from 1 for 5),
    'reschedule_count', v_reschedule_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reschedule_booking_atomic TO authenticated;
