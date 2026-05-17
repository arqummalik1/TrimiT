# TrimiT v1 feature flags (narrow Play Store launch)

Apply these for **closed testing / v1** until later phases enable features.

| Flag | Env var | v1 default | Phase to enable |
|------|---------|------------|-----------------|
| Online pay (Razorpay) | `EXPO_PUBLIC_ENABLE_ONLINE_PAY` | `false` | Phase 5 |
| Staff selection UI | `EXPO_PUBLIC_ENABLE_STAFF_SELECTION` | `false` | Phase 4 |

**Backend / owner settings**

- Prefer salons with `allow_multiple_bookings_per_slot = false` until Phase 4 multi-booking UX is verified.
- Migrations `29`–`32` must be applied before v1 cash bookings (see [database/MIGRATION_ORDER.md](database/MIGRATION_ORDER.md)).

**QA baseline (audit §17)**

Record pass/fail before and after each phase in your issue tracker.
