# TrimiT Database Migration Guide

## 📋 Complete Migration Sequence

This guide provides the **exact order** to run all SQL migration scripts on your Supabase database.

---

## ✅ MIGRATION SEQUENCE

Run these scripts **in this exact order**:

### CORE SCHEMA (Foundation)
```bash
# 1. Core tables (users, salons, services, bookings, reviews)
psql -h <supabase-host> -U postgres -d postgres -f database/01_schema.sql

# 2. Sample data for testing
psql -h <supabase-host> -U postgres -d postgres -f database/02_seed_data.sql

# 3. Storage buckets for images
psql -h <supabase-host> -U postgres -d postgres -f database/03_setup_storage.sql

# 4. Service offers feature
psql -h <supabase-host> -U postgres -d postgres -f database/04_add_service_offers.sql

# 5. Real-time subscriptions
psql -h <supabase-host> -U postgres -d postgres -f database/05_enable_realtime_bookings.sql

# 6. Verify real-time setup
psql -h <supabase-host> -U postgres -d postgres -f database/06_verify_realtime.sql

# 7. Verify RLS policies
psql -h <supabase-host> -U postgres -d postgres -f database/07_check_rls_policies.sql

# 8. Multi-booking per slot
psql -h <supabase-host> -U postgres -d postgres -f database/08_add_max_bookings_per_slot.sql

# 9. Production optimizations
psql -h <supabase-host> -U postgres -d postgres -f database/09_production_updates.sql

# 10. Geospatial search (Haversine)
psql -h <supabase-host> -U postgres -d postgres -f database/10_add_nearby_salons_rpc.sql

# 11. Idempotency for payments
psql -h <supabase-host> -U postgres -d postgres -f database/11_idempotency_keys.sql
```

### PHASE 1 FEATURES (Promo Codes & Rescheduling)
```bash
# 12. Promo codes system ✅ PHASE 1.1
psql -h <supabase-host> -U postgres -d postgres -f database/13_promo_codes.sql

# 13. One-click rescheduling ✅ PHASE 1.2
psql -h <supabase-host> -U postgres -d postgres -f database/14_booking_reschedule.sql
```

### PHASE 2 FEATURES (Staff Selection)
```bash
# 14. Staff selection system 🚀 PHASE 2.1 (NEW)
psql -h <supabase-host> -U postgres -d postgres -f database/15_staff_selection.sql
```

---

## 🔍 VERIFICATION STEPS

After running each migration, verify it worked:

### 1. Check Tables Exist
```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables after all migrations:
-- bookings
-- booking_reschedules
-- idempotency_keys
-- promo_usage
-- promotions
-- reviews
-- salons
-- services
-- staff
-- staff_services
-- users
```

### 2. Check RPC Functions
```sql
-- List all functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Expected functions:
-- check_staff_availability
-- create_atomic_booking
-- get_available_staff
-- get_booking_reschedule_history
-- nearby_salons
-- reschedule_booking_atomic
-- update_staff_rating
-- validate_promo_code
```

### 3. Check Sample Data
```sql
-- Check salons
SELECT COUNT(*) FROM salons;

-- Check services
SELECT COUNT(*) FROM services;

-- Check staff (after migration 15)
SELECT COUNT(*) FROM staff;

-- Check promotions (after migration 13)
SELECT COUNT(*) FROM promotions;
```

### 4. Test RPC Functions
```sql
-- Test nearby salons
SELECT * FROM nearby_salons(28.6139, 77.2090, 5000);

-- Test promo validation
SELECT * FROM validate_promo_code('TRIMIT50', 'salon-id-here', 500);

-- Test staff availability (after migration 15)
SELECT check_staff_availability(
    'staff-id-here'::uuid,
    'service-id-here'::uuid,
    '2026-05-10'::date,
    '14:00:00'::time,
    30
);
```

---

## 🚨 TROUBLESHOOTING

### Issue: "relation already exists"
**Solution**: Migration was already run. Skip to next migration.

### Issue: "function does not exist"
**Solution**: Previous migration failed. Re-run previous migration.

### Issue: "permission denied"
**Solution**: Use postgres superuser or service_role key.

### Issue: "syntax error"
**Solution**: Check PostgreSQL version (requires 12+).

---

## 📊 MIGRATION STATUS TRACKER

Use this checklist to track your progress:

```
Core Schema:
[x] 01_schema.sql                    ✅ Foundation
[x] 02_seed_data.sql                 ✅ Sample data
[x] 03_setup_storage.sql             ✅ Storage
[x] 04_add_service_offers.sql        ✅ Service offers
[x] 05_enable_realtime_bookings.sql  ✅ Real-time
[x] 06_verify_realtime.sql           ✅ Verification
[x] 07_check_rls_policies.sql        ✅ Security
[x] 08_add_max_bookings_per_slot.sql ✅ Multi-booking
[x] 09_production_updates.sql        ✅ Optimizations
[x] 10_add_nearby_salons_rpc.sql     ✅ Geospatial
[x] 11_idempotency_keys.sql          ✅ Idempotency

Phase 1 Features:
[ ] 13_promo_codes.sql               ⏳ Promo codes
[ ] 14_booking_reschedule.sql        ⏳ Rescheduling

Phase 2 Features:
[ ] 15_staff_selection.sql           🚀 Staff selection (NEW)
```

---

## 🎯 QUICK START (Fresh Database)

If you're setting up a **brand new** Supabase project:

```bash
# Run all migrations in sequence
cd database

for file in 01_schema.sql 02_seed_data.sql 03_setup_storage.sql \
            04_add_service_offers.sql 05_enable_realtime_bookings.sql \
            06_verify_realtime.sql 07_check_rls_policies.sql \
            08_add_max_bookings_per_slot.sql 09_production_updates.sql \
            10_add_nearby_salons_rpc.sql 11_idempotency_keys.sql \
            13_promo_codes.sql 14_booking_reschedule.sql \
            15_staff_selection.sql; do
    echo "Running $file..."
    psql -h <supabase-host> -U postgres -d postgres -f $file
    if [ $? -eq 0 ]; then
        echo "✅ $file completed successfully"
    else
        echo "❌ $file failed"
        exit 1
    fi
done

echo "🎉 All migrations completed!"
```

---

## 🔐 SUPABASE DASHBOARD METHOD

If you prefer using the Supabase Dashboard:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy contents of migration file
4. Click **Run**
5. Verify success message
6. Repeat for each migration in order

---

## 📝 ROLLBACK STRATEGY

If you need to rollback a migration:

### Rollback Staff Selection (15)
```sql
-- Drop staff tables
DROP TABLE IF EXISTS staff_services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- Remove columns from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS staff_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS any_staff;

-- Remove column from reviews
ALTER TABLE reviews DROP COLUMN IF EXISTS staff_id;

-- Drop functions
DROP FUNCTION IF EXISTS check_staff_availability;
DROP FUNCTION IF EXISTS get_available_staff;
DROP FUNCTION IF EXISTS update_staff_rating;

-- Drop view
DROP VIEW IF EXISTS staff_performance;
```

### Rollback Rescheduling (14)
```sql
-- Drop reschedule table
DROP TABLE IF EXISTS booking_reschedules CASCADE;

-- Remove columns from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS reschedule_count;
ALTER TABLE bookings DROP COLUMN IF EXISTS last_rescheduled_at;
ALTER TABLE bookings DROP COLUMN IF EXISTS original_date;
ALTER TABLE bookings DROP COLUMN IF EXISTS original_time_slot;

-- Drop function
DROP FUNCTION IF EXISTS reschedule_booking_atomic;
DROP FUNCTION IF EXISTS get_booking_reschedule_history;
```

### Rollback Promo Codes (13)
```sql
-- Drop promo tables
DROP TABLE IF EXISTS promo_usage CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

-- Remove columns from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS promo_code;
ALTER TABLE bookings DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS original_amount;

-- Drop function
DROP FUNCTION IF EXISTS validate_promo_code;
```

---

## 🎓 BEST PRACTICES

1. **Always backup** before running migrations
2. **Test on staging** environment first
3. **Run migrations during low traffic** periods
4. **Verify each migration** before proceeding
5. **Keep migration logs** for audit trail
6. **Use transactions** when possible
7. **Document custom changes** separately

---

## 📞 SUPPORT

If you encounter issues:

1. Check Supabase logs in Dashboard
2. Verify PostgreSQL version (12+)
3. Check RLS policies are enabled
4. Verify service_role key permissions
5. Review error messages carefully

---

**Last Updated**: May 3, 2026  
**Total Migrations**: 14 files  
**Estimated Time**: 30-45 minutes for all migrations

---

*"Migrations are like building blocks - each one depends on the previous. Follow the order, verify each step, and you'll have a rock-solid foundation."*
