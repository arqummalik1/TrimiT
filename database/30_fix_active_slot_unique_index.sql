-- 30: Fix uq_bookings_active_slot — breaks multi-booking salons (CRIT-02)
-- Capacity for all salons is enforced in create_atomic_booking (migration 29).
-- If DROP fails with 23505 duplicates, run 28_pre_unique_index_duplicate_cleanup.sql first.

DROP INDEX IF EXISTS public.uq_bookings_active_slot;

SELECT 'Migration 30 applied: removed global single-slot unique index (use RPC capacity)' AS status;
