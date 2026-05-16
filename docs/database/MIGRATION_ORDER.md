# Database migration apply order

Apply manually in the Supabase SQL editor. **Do not rename** files already applied in production.

## Collision notes (same numeric prefix)

| Prefix | Files | Apply order |
|--------|-------|-------------|
| `03_` | `03_fix_schema_mismatch.sql` then `03_setup_storage.sql` | Fix schema first, then storage |
| `15_` | `15_reschedule_atomic_time_compare.sql` then `15_staff_selection.sql` | Reschedule before staff |
| `16_` | `16_fix_staff_availability.sql` then `16_reschedule_remove_booking_updated_at.sql` | Staff fix before reschedule cleanup |

## Full sequence (greenfield)

1. `01_schema.sql` through `09_production_updates.sql` (numeric order)
2. `10` … `24` in numeric order
3. `25_booking_integrity_and_payments.sql` — razorpay_order_id, partial unique slot index
4. `26_slot_holds_unique.sql` — hold dedupe index
5. `27_booking_rpc_for_update.sql` — `create_atomic_booking` FOR UPDATE lock
6. `28_pre_unique_index_duplicate_cleanup.sql` — only if migration 25 unique index fails (23505)
7. Re-run `07_check_rls_policies.sql` after 22–27

## Production checklist

- [x] Migration `24_user_notification_preferences.sql` applied (2026-05-16, Supabase MCP)
- [x] Migration `25_booking_integrity_and_payments.sql` applied (`razorpay_order_id`, `uq_bookings_active_slot`)
- [x] Migration `26_slot_holds_unique.sql` applied
- [x] Migration `27_booking_rpc_for_update.sql` applied (12-arg `create_atomic_booking` uses `FOR UPDATE`)
- [x] If index 25 fails with 23505: run `28_pre_unique_index_duplicate_cleanup.sql` first
- [ ] Optional: enable pg_cron job in `25` comments (deferred for cash-only v1)
- [ ] Re-run `07_check_rls_policies.sql` in SQL editor after deploy
