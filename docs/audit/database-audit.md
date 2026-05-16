# Database Audit (Supabase Postgres)

**Migrations:** 27 files in `database/` (01–24 + duplicates)  
**Advisor run:** 2026-05-16 (security)

---

## Schema overview

### Core tables
| Table | Purpose | RLS |
|-------|---------|-----|
| `users` | Profile + push prefs | ✅ |
| `salons` | Salon listings | ✅ (public read) |
| `services` | Service catalog | ✅ |
| `bookings` | Appointments | ✅ |
| `reviews` | Post-completion reviews | ✅ |

### Extension tables
| Table | Migration | RLS |
|-------|-----------|-----|
| `promotions`, `promo_usage` | 13 | ✅ (permissive insert on usage) |
| `idempotency_keys` | 11 | ✅ (service role writes) |
| `staff`, `staff_services` | 15 | ✅ |
| `booking_reschedules` | 14 | ✅ |
| `slot_holds` | 22 | ✅ |
| `notification_events` | 24 | ✅ (no client policies — intentional) |

---

## Migration hygiene issues

| Issue | Files | Risk |
|-------|-------|------|
| Duplicate `03_*` | `03_fix_schema_mismatch.sql`, `03_setup_storage.sql` | Apply order ambiguity |
| Duplicate `15_*` | `15_staff_selection.sql`, `15_reschedule_atomic_time_compare.sql` | |
| Duplicate `16_*` | `16_fix_staff_availability.sql`, `16_reschedule_remove_booking_updated_at.sql` | |
| Split directories | `database/` vs `backend/database/` | Drift between envs |
| Ad-hoc script | `RUN_THIS_FIX.sql` at repo root | Destructive if re-run |

**Recommendation:** New migrations only as `25_*.sql`, `26_*.sql`; document applied set in `schema_migrations` table.

---

## RLS policy audit

### Strengths
- RLS enabled on all user-data tables.
- Salons/services public read by design (marketplace).
- `slot_holds` — users see only own holds.
- Owner policies on salon/service/booking updates.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Customer booking UPDATE | High | May block customer cancel via API if no UPDATE policy |
| `promo_usage` INSERT true | Medium | Any authenticated user can insert |
| `users` INSERT true | Low | Signup path; backend uses service role |
| `notification_events` no policies | Info | OK — backend-only via service role |
| RPC bypass RLS | Critical | SECURITY DEFINER without `auth.uid()` checks |

---

## Indexes (verified / recommended)

**Present (highlights):**
- `bookings`: user_id, salon_id, booking_date
- `slot_holds`: salon+date, expires_at
- `notification_events`: booking_id
- `users.push_token` (if column exists)

**Missing (critical):**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_bookings_active_slot
ON public.bookings (salon_id, booking_date, time_slot)
WHERE status <> 'cancelled';
```

---

## SECURITY DEFINER functions

Supabase security advisor flagged **anon/authenticated EXECUTE** on:

- `create_atomic_booking` ⚠️ **Critical**
- `reserve_slot_v1` ⚠️ **Critical**
- `reschedule_booking_atomic`
- `validate_promo_code`
- `get_nearby_salons_v1`
- `cleanup_expired_holds`
- `check_staff_availability`
- `get_available_staff`

**Remediation:**
```sql
REVOKE EXECUTE ON FUNCTION public.create_atomic_booking(...) FROM anon;
-- Keep authenticated only if needed, or revoke all and use service role from API only
```

Inside functions, add:
```sql
IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
  RAISE EXCEPTION 'unauthorized';
END IF;
```

---

## Storage

| Bucket | Access | Issue |
|--------|--------|-------|
| `salon-images` | Public read | Advisor: listing enabled — consider object-only URLs |

---

## Realtime

- Enabled on `bookings` (migrations 05/06).
- Mobile subscribes for slot invalidation.
- Monitor replication slot lag on scale.

---

## Notification preferences (migration 24)

```sql
users: push_enabled, notify_bookings, notify_booking_updates,
       notify_promotional, notify_reminders
notification_events: dedupe (booking_id, event_type, recipient_user_id)
```

**Status:** Applied in repo; confirm production Supabase has migration 24.

---

## Scheduled jobs (missing)

| Job | Function | Status |
|-----|----------|--------|
| Hold cleanup | `cleanup_expired_holds()` | Function exists; **not scheduled** |
| Pending payment cancel | — | **Not implemented** |
| Idempotency cleanup | `delete_expired_idempotency_keys()` | Not scheduled |

---

## Supabase advisor summary

| Level | Count | Top items |
|-------|-------|-----------|
| ERROR | 1 | `staff_performance` SECURITY DEFINER view |
| WARN | 20+ | RPC EXECUTE, permissive RLS, public bucket listing |
| INFO | 1 | `notification_events` RLS no policy |

---

## Pre-launch SQL checklist

- [ ] Apply `25_slot_unique_index.sql`
- [ ] Apply `26_rpc_auth_hardening.sql` (revoke + uid checks)
- [ ] Add customer cancel UPDATE policy on `bookings`
- [ ] Schedule `cleanup_expired_holds` via pg_cron
- [ ] Enable PITR on Supabase project
- [ ] Re-run `07_check_rls_policies.sql`
- [ ] Fix `staff_performance` view (INVOKER or restrict)
