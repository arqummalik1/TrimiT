-- 45: Reschedule target slot — validate staff availability and conflicts (BUG-01)
-- Updates reschedule_booking_atomic to check active status, working hours, days off,
-- and conflicting bookings (excluding the current booking being rescheduled) for the staff.

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
  v_hold_others INTEGER;
  v_max_bookings INTEGER;
  v_allow_multiple BOOLEAN;
  v_reschedule_count INTEGER;
  v_norm_slot TEXT;
  
  -- Staff validation variables
  v_service_duration INTEGER;
  v_staff_active BOOLEAN;
  v_staff_working_hours JSONB;
  v_day_of_week TEXT;
  v_day_enabled BOOLEAN;
  v_start_time TIME;
  v_end_time TIME;
  v_is_day_off BOOLEAN;
  v_staff_conflicts INTEGER;
BEGIN
  -- 1. Fetch booking details and lock the row to prevent concurrent modification races
  SELECT 
    b.id, b.salon_id, b.service_id, b.booking_date, b.time_slot,
    b.status, b.user_id, COALESCE(b.reschedule_count, 0) as reschedule_count,
    b.staff_id
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- 2. Verify status
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object('success', false, 'error', 'Only pending or confirmed bookings can be rescheduled');
  END IF;

  -- 3. Authorization checks
  IF p_user_role = 'customer' AND v_booking.user_id != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only reschedule your own bookings');
  END IF;

  IF p_user_role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM salons 
      WHERE id = v_booking.salon_id AND owner_id = p_user_id
    ) THEN
      RETURN json_build_object('success', false, 'error', 'You can only reschedule bookings for your salon');
    END IF;
  END IF;

  -- Normalize time slot format
  v_norm_slot := substring(trim(p_new_time_slot) from 1 for 5);

  -- 4. Verify slot is different
  IF v_booking.booking_date = p_new_date 
     AND LEFT(v_booking.time_slot, 5) = v_norm_slot THEN
    RETURN json_build_object('success', false, 'error', 'New slot must be different from current slot');
  END IF;

  -- 5. Verify not in the past
  IF p_new_date < CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reschedule to a past date');
  END IF;

  -- 6. Validate staff availability (if a staff member is assigned)
  IF v_booking.staff_id IS NOT NULL THEN
    -- Get service duration
    SELECT duration INTO v_service_duration
    FROM services
    WHERE id = v_booking.service_id;

    IF v_service_duration IS NULL THEN
      v_service_duration := 30; -- Default fallback
    END IF;

    -- Get staff details
    SELECT is_active, working_hours
    INTO v_staff_active, v_staff_working_hours
    FROM staff
    WHERE id = v_booking.staff_id;

    IF NOT FOUND OR NOT COALESCE(v_staff_active, false) THEN
      RETURN json_build_object('success', false, 'error', 'Assigned staff member is no longer active');
    END IF;

    -- Check working hours day-enabled status
    v_day_of_week := LOWER(TO_CHAR(p_new_date, 'Day'));
    v_day_of_week := TRIM(v_day_of_week);
    
    v_day_enabled := (v_staff_working_hours->v_day_of_week->>'enabled')::boolean;
    IF NOT COALESCE(v_day_enabled, false) THEN
      RETURN json_build_object('success', false, 'error', 'Assigned staff does not work on this day of the week');
    END IF;

    -- Check if selected date is marked as a day off
    SELECT p_new_date::TEXT = ANY(days_off)
    INTO v_is_day_off
    FROM staff
    WHERE id = v_booking.staff_id;

    IF COALESCE(v_is_day_off, false) THEN
      RETURN json_build_object('success', false, 'error', 'Selected date is a day off for the assigned staff');
    END IF;

    -- Check working hours boundary
    v_start_time := (v_staff_working_hours->v_day_of_week->>'start')::TIME;
    v_end_time := (v_staff_working_hours->v_day_of_week->>'end')::TIME;
    
    IF (v_norm_slot || ':00')::TIME < v_start_time OR (v_norm_slot || ':00')::TIME >= v_end_time THEN
      RETURN json_build_object('success', false, 'error', 'Requested slot is outside staff working hours');
    END IF;

    -- Check conflicting bookings for this staff member (excluding the current booking being rescheduled!)
    SELECT COUNT(*)
    INTO v_staff_conflicts
    FROM bookings b
    INNER JOIN services s ON b.service_id = s.id
    WHERE b.staff_id = v_booking.staff_id
      AND b.booking_date = p_new_date
      AND b.status IN ('pending', 'confirmed')
      AND b.id <> p_booking_id -- EXCLUDE the current booking to avoid self-conflict
      AND (
          -- Overlap validation matching staff_selection.sql
          ((v_norm_slot || ':00')::TIME >= b.time_slot::TIME 
           AND (v_norm_slot || ':00')::TIME < b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL)
          OR
          ((v_norm_slot || ':00')::TIME + (v_service_duration || ' minutes')::INTERVAL > b.time_slot::TIME 
           AND (v_norm_slot || ':00')::TIME + (v_service_duration || ' minutes')::INTERVAL <= b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL)
          OR
          ((v_norm_slot || ':00')::TIME <= b.time_slot::TIME 
           AND (v_norm_slot || ':00')::TIME + (v_service_duration || ' minutes')::INTERVAL >= b.time_slot::TIME + (s.duration || ' minutes')::INTERVAL)
      );

    IF v_staff_conflicts > 0 THEN
      RETURN json_build_object('success', false, 'error', 'Assigned staff member has a scheduling conflict at this time');
    END IF;
  END IF;

  -- 7. Validate salon capacity
  SELECT 
    s.max_bookings_per_slot,
    s.allow_multiple_bookings_per_slot
  INTO v_max_bookings, v_allow_multiple
  FROM salons s
  WHERE s.id = v_booking.salon_id
  FOR UPDATE;

  SELECT COUNT(*)
  INTO v_current_bookings
  FROM bookings
  WHERE salon_id = v_booking.salon_id
    AND booking_date = p_new_date
    AND LEFT(time_slot, 5) = v_norm_slot
    AND status IN ('pending', 'confirmed')
    AND id != p_booking_id;

  SELECT COUNT(*) INTO v_hold_others
    FROM slot_holds
   WHERE salon_id = v_booking.salon_id
     AND booking_date = p_new_date
     AND LEFT(time_slot, 5) = v_norm_slot
     AND user_id <> p_user_id
     AND expires_at > NOW();

  v_current_bookings := v_current_bookings + v_hold_others;

  IF NOT v_allow_multiple AND v_current_bookings > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Selected time slot is not available');
  END IF;

  IF v_allow_multiple AND v_current_bookings >= v_max_bookings THEN
    RETURN json_build_object('success', false, 'error', 'Selected time slot is not available');
  END IF;

  -- 8. Perform update and insert audit history record
  v_old_date := v_booking.booking_date;
  v_old_time_slot := v_booking.time_slot;
  v_reschedule_count := v_booking.reschedule_count + 1;

  UPDATE bookings
  SET 
    booking_date = p_new_date,
    time_slot = v_norm_slot,
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
    v_norm_slot,
    p_user_id,
    p_user_role,
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'reschedule_count', v_reschedule_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration 45 applied: reschedule validates staff active status, working hours, days off, and conflicts' AS status;
