-- ==========================================
-- 08 - ADD MAX BOOKINGS PER SLOT
-- Adds capacity limit for multi-booking slots
-- Safe to run on live DB — adds column with default, no data loss
-- ==========================================

-- Add max_bookings_per_slot column (default 1 = single booking behavior)
ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 1;

-- Add check constraint to ensure valid range (1-100)
ALTER TABLE public.salons
ADD CONSTRAINT chk_max_bookings_range
CHECK (max_bookings_per_slot >= 1 AND max_bookings_per_slot <= 100);

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
SELECT '✅ 08 - max_bookings_per_slot column added to salons' as status;
SELECT '📋 Salons now support configurable booking capacity per slot' as next_step;
