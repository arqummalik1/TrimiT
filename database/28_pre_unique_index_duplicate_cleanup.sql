-- 28: Run BEFORE applying uq_bookings_active_slot if index creation fails with 23505.
-- Keeps the oldest active booking per salon/date/slot; cancels duplicates.

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY salon_id, booking_date, time_slot
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.bookings
  WHERE status <> 'cancelled'
)
UPDATE public.bookings b
SET status = 'cancelled'
FROM ranked r
WHERE b.id = r.id AND r.rn > 1;

SELECT 'Migration 28: duplicate active bookings cancelled' AS status;
