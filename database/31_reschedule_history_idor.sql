-- 31: Close IDOR on get_booking_reschedule_history (CRIT-06)

CREATE OR REPLACE FUNCTION public.get_booking_reschedule_history(p_booking_id UUID)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id
      AND (
        b.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.salons s
          WHERE s.id = b.salon_id AND s.owner_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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
  FROM public.booking_reschedules br
  WHERE br.booking_id = p_booking_id
  ORDER BY br.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.get_booking_reschedule_history(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_booking_reschedule_history(UUID) TO authenticated;

SELECT 'Migration 31 applied: reschedule history IDOR fix' AS status;
