-- 26: Prevent duplicate holds per user/slot

CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_holds_user_slot
  ON public.slot_holds (salon_id, booking_date, time_slot, user_id);

SELECT 'Migration 26 applied: uq_slot_holds_user_slot' AS status;
