# TrimiT Migration Order (V2 — through 64)

Apply **forward-only** in the Supabase SQL Editor. Never edit applied migrations.

## Canonical location

All production migrations live in `/database/`. Migrations **52–54** were previously only under `backend/database/` — they are now duplicated in `/database/` for a single source of truth.

## Checklist

| # | File | Purpose |
|---|------|---------|
| 01 | `01_schema.sql` | Core tables, users, salons, bookings |
| 02 | `02_seed_data.sql` | Dev seed (skip in prod if not needed) |
| 03 | `03_fix_schema_mismatch.sql` | Schema fixes |
| 03 | `03_setup_storage.sql` | Storage buckets |
| 04–08 | `04_*` … `08_*` | Services, realtime, slot capacity |
| 09 | `09_production_updates.sql` | Production column updates |
| 10–19 | `10_*` … `19_*` | Nearby salons RPC, staff, promos |
| 20–34 | `20_*` … `34_*` | Atomic booking, holds, idempotency, staff booking |
| 35–45 | `35_*` … `45_*` | Reschedule, payments integrity |
| **46** | **`46_lock_down_booking_updates.sql`** | **P0 — revokes direct booking UPDATE via PostgREST** |
| 47–51 | `47_*` … `51_*` | Bank details, UPI, subscriptions, analytics |
| **52** | **`52_user_management.sql`** | `is_blocked`, `deleted_at` on users |
| **53** | **`53_salon_open_close.sql`** | `accepting_bookings`, closed windows |
| **54** | **`54_service_areas_and_waitlist.sql`** | Jammu geofence + waitlist |
| **55** | **`55_staff_app_login.sql`** | Employee role + staff app login link |
| **56** | **`56_reschedule_auth_hardening.sql`** | `auth.uid()` on reschedule RPC |
| **57** | **`57_service_categories.sql`** | `service_categories` table + `services.category_id` FK |
| **58** | **`58_gender_serve_and_discovery.sql`** | Salon gender serve, customer discovery prefs, service audience, RPC filter |
| **59** | **`59_salon_promo_hardening.sql`** | Lane A — salon-only `validate_promo_code`, deactivate global seed promos |
| **60** | **`60_customer_phone_unique.sql`** | Unique customer phone index (welcome grant anti-abuse) |
| **61** | **`61_platform_campaigns.sql`** | Lane B — `platform_campaigns`, `campaign_grants`, TRIMIT50 seed, admin APIs |
| **62** | **`62_rls_hardening_critical.sql`** | Critical RLS and column privilege hardening |
| **63** | **`63_account_deletion_integrity.sql`** | Account-deletion FK integrity; preserves booking verifier relationship |
| **64** | **`64_atomic_owner_salon_activation.sql`** | Atomic first salon + owner activation and guarded incomplete-owner recovery |

## Verify in production

Run in SQL Editor:

```sql
-- 46: authenticated should NOT have UPDATE on bookings
SELECT has_table_privilege('authenticated', 'public.bookings', 'UPDATE');

-- 52: user management columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('is_blocked', 'deleted_at');

-- 53: salon open/close
SELECT column_name FROM information_schema.columns
WHERE table_name = 'salons' AND column_name = 'accepting_bookings';

-- 55: staff app login
SELECT column_name FROM information_schema.columns
WHERE table_name = 'staff' AND column_name IN ('user_id', 'app_access_status');

-- 56: reschedule function exists
SELECT proname FROM pg_proc WHERE proname = 'reschedule_booking_atomic';

-- 57: service categories
SELECT column_name FROM information_schema.columns
WHERE table_name = 'services' AND column_name = 'category_id';
SELECT to_regclass('public.service_categories');

-- 58: gender serve + discovery
SELECT column_name FROM information_schema.columns
WHERE table_name = 'salons' AND column_name = 'gender_serve';
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('gender', 'discovery_audience');
SELECT column_name FROM information_schema.columns
WHERE table_name = 'services' AND column_name = 'audience';

-- 59–61: promo system
SELECT to_regclass('public.platform_campaigns');
SELECT code, active FROM platform_campaigns WHERE code = 'TRIMIT50';

-- 63: account-deletion foreign keys must not block user/profile removal
SELECT conrelid::regclass AS table_name,
       conname,
       confdeltype
FROM pg_constraint
WHERE contype = 'f'
  AND conname IN (
    'promotions_created_by_fkey',
    'booking_reschedules_initiated_by_fkey',
    'refunds_payment_id_fkey',
    'payments_booking_id_fkey',
    'payments_salon_id_fkey',
    'payments_user_id_fkey',
    'notification_events_recipient_user_id_fkey',
    'bookings_verified_by_fkey'
  )
ORDER BY conname;

-- 64: backend-only owner-onboarding functions and role trigger
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN (
  'activate_owner_and_create_salon_v1',
  'cancel_empty_owner_workspace_v1'
);
SELECT event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_users_create_owner_trial';
```

Expected: `has_table_privilege` → **false** for authenticated UPDATE on bookings;
all columns present; migration 63 constraints report delete action `c` (cascade)
or `n` (set null), never `a` (no action).

## After applying 55–61

- Re-run backend tests: `cd backend && PYTHONPATH=. pytest -q`
- Owner can invite staff via `POST /staff/{id}/invite-app`
- Employee signs up with matching phone + role `employee`
- **57–58 applied in Supabase SQL Editor (2026-07-05):** service categories + gender serve / discovery live in production
- **59–61:** Lane A/B promo system — see `docs/v2_docs/DEVELOPER_GUIDE.md`
- **62:** RLS hardening (already marked live in `PROGRESS_v2.md`)
- **63:** Account-deletion integrity; apply before deploying/shipping the in-app
  deletion flow, then verify both deletion API routes return `401`, not `404`,
  without authentication.
- **64:** Apply before the reversible owner-onboarding backend/mobile rollout.
  Verify a failed salon create leaves the test identity as customer and a valid
  create produces one salon, one subscription, and one trial-started event.
