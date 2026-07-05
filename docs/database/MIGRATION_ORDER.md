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
7. `29_booking_rpc_hardening.sql` — auth.uid, holds, amount, reserve FOR UPDATE
8. `30_fix_active_slot_unique_index.sql` — drop `uq_bookings_active_slot`
9. `31_reschedule_history_idor.sql`
10. `32_idempotency_unique_path.sql`
11. `33_expire_pending_online_bookings.sql` — function only; cron when online pay enabled
12. `34_create_atomic_booking_staff.sql` — staff params (Phase 4)
13. `35_reschedule_holds_capacity.sql` — reschedule counts holds
14. Re-run `07_check_rls_policies.sql` after 22–35

## Production checklist

- [x] Migration `24_user_notification_preferences.sql` applied (2026-05-16, Supabase MCP)
- [x] Migration `25_booking_integrity_and_payments.sql` applied (`razorpay_order_id`, `uq_bookings_active_slot`)
- [x] Migration `26_slot_holds_unique.sql` applied
- [x] Migration `27_booking_rpc_for_update.sql` applied (12-arg `create_atomic_booking` uses `FOR UPDATE`)
- [x] If index 25 fails with 23505: run `28_pre_unique_index_duplicate_cleanup.sql` first
- [x] Migration `29_booking_rpc_hardening.sql` applied (2026-05-17, Supabase SQL editor)
- [x] Migration `30_fix_active_slot_unique_index.sql` applied
- [x] Migration `31_reschedule_history_idor.sql` applied
- [x] Migration `32_idempotency_unique_path.sql` applied
- [x] Migration `33_expire_pending_online_bookings.sql` applied
- [x] Migration `34_create_atomic_booking_staff.sql` applied
- [x] Migration `35_reschedule_holds_capacity.sql` applied
- [ ] Optional: enable pg_cron in `33` when online pay ships
- [ ] Re-run `07_check_rls_policies.sql` in SQL editor after deploy

## Critical — new owner salon creation (P0)

**If new owners cannot create a salon (500 / silent rollback), apply immediately:**

| # | File | Why |
|---|------|-----|
| 44 | `44_fix_salon_subscription_trigger_fk.sql` | Migration 41's BEFORE INSERT trigger breaks new salon inserts (FK on `subscriptions.salon_id`). **Every new owner is blocked until this runs.** |

After 44, continue with `45` … `61` in numeric order (see `docs/v2_docs/MIGRATION_ORDER_v2.md` when present).
