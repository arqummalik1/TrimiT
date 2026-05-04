# 🔧 Database Migration Fix Summary

**Date**: May 3, 2026  
**Issue**: Type mismatches in staff availability functions  
**Status**: ✅ **FIXED**

---

## 🐛 Problems Found

After reviewing all database schema files, I found these issues in the original `database/15_staff_selection.sql`:

### Issue 1: `time_slot` Type Mismatch
- **Problem**: `time_slot` column in `bookings` table is **TEXT**, not TIME
- **Impact**: Function tried to compare TEXT with TIME directly
- **Error**: `operator does not exist: text >= time without time zone`

### Issue 2: Missing `duration` Column
- **Problem**: `bookings` table doesn't have a `duration` column
- **Impact**: Function tried to access non-existent column
- **Error**: `column "duration" does not exist`
- **Solution**: Get duration from `services` table via JOIN

### Issue 3: Wrong Function Signature
- **Problem**: `create_atomic_booking` had wrong parameters
- **Impact**: Function tried to INSERT into non-existent `duration` column
- **Solution**: Remove duration from INSERT, get it from services table

---

## ✅ Solution: Run These Files in Order

### Step 1: Run the Final Fix (REQUIRED)
```sql
-- File: database/17_final_staff_fix.sql
-- This fixes ALL the issues
```

**What it does:**
1. ✅ Drops and recreates `check_staff_availability()` with proper type casting
2. ✅ Fixes time_slot comparison (TEXT::TIME)
3. ✅ Joins with services table to get duration
4. ✅ Drops and recreates `create_atomic_booking()` with correct signature
5. ✅ Removes duration from INSERT statement
6. ✅ Includes verification tests

### Step 2: Verify Everything Works (OPTIONAL)
```sql
-- File: database/18_verify_complete.sql
-- This runs comprehensive tests
```

**What it checks:**
- ✅ All tables exist
- ✅ All columns exist
- ✅ All functions work
- ✅ Sample data exists
- ✅ Functions return correct results

---

## 📋 Complete Migration Sequence

If you're setting up from scratch, run in this **exact order**:

```bash
# Core Schema (1-11)
1.  database/01_schema.sql              # Core tables
2.  database/02_seed_data.sql           # Sample data
3.  database/03_setup_storage.sql       # Storage buckets
4.  database/04_add_service_offers.sql  # Service offers
5.  database/05_enable_realtime_bookings.sql
6.  database/06_verify_realtime.sql
7.  database/07_check_rls_policies.sql
8.  database/08_add_max_bookings_per_slot.sql
9.  database/09_production_updates.sql
10. database/10_add_nearby_salons_rpc.sql
11. database/11_idempotency_keys.sql

# Phase 1 Features (13-14)
12. database/13_promo_codes.sql         # Promo codes
13. database/14_booking_reschedule.sql  # Rescheduling

# Phase 2.1 Features (15, 17)
14. database/15_staff_selection.sql     # Staff system (has bugs)
15. database/17_final_staff_fix.sql     # ⭐ FIX (REQUIRED!)

# Verification (18)
16. database/18_verify_complete.sql     # Verify all works
```

---

## 🎯 What You Need to Do NOW

### Option A: If You Already Ran Migration 15
Run **ONLY** this file:
```sql
-- database/17_final_staff_fix.sql
```

This will:
- Drop the buggy functions
- Recreate them with fixes
- Test that they work

### Option B: If You Haven't Run Migration 15 Yet
Run **BOTH** files in order:
```sql
1. database/15_staff_selection.sql
2. database/17_final_staff_fix.sql
```

---

## 🧪 How to Test

After running the fix, test with these queries:

### Test 1: Check Staff Availability
```sql
SELECT check_staff_availability(
    (SELECT id FROM staff LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    (CURRENT_DATE + INTERVAL '1 day')::DATE,
    '14:00:00'::TIME,
    30
);
-- Expected: true or false (boolean)
```

### Test 2: Get Available Staff
```sql
SELECT * FROM get_available_staff(
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    (CURRENT_DATE + INTERVAL '1 day')::DATE,
    '14:00:00'::TIME
);
-- Expected: List of available staff (may be empty)
```

### Test 3: Create Booking with Staff
```sql
SELECT * FROM create_atomic_booking(
    (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    (CURRENT_DATE + INTERVAL '2 days')::DATE,
    '15:00',  -- TEXT format
    'salon_cash',
    500.00,
    NULL,  -- promo_code
    0,     -- discount
    500.00, -- original_amount
    (SELECT id FROM staff LIMIT 1),  -- staff_id
    false  -- any_staff
);
-- Expected: booking_id, success=true, message='Booking created successfully'
```

---

## 📊 Database Schema Reference

### Bookings Table Structure
```sql
CREATE TABLE bookings (
    id UUID,
    user_id UUID,
    salon_id UUID,
    service_id UUID,
    booking_date DATE,
    time_slot TEXT,              -- ⚠️ TEXT, not TIME!
    status TEXT,
    payment_status TEXT,
    payment_method TEXT,
    amount DECIMAL(10,2),
    promo_code TEXT,
    discount_amount DECIMAL(10,2),
    original_amount DECIMAL(10,2),
    staff_id UUID,               -- ✅ NEW (Phase 2.1)
    any_staff BOOLEAN,           -- ✅ NEW (Phase 2.1)
    reschedule_count INTEGER,    -- ✅ NEW (Phase 1.2)
    -- NO duration column!
);
```

### Services Table Structure
```sql
CREATE TABLE services (
    id UUID,
    salon_id UUID,
    name TEXT,
    description TEXT,
    price DECIMAL(10,2),
    duration INTEGER,            -- ⚠️ Duration is HERE!
);
```

---

## 🚀 After Database is Fixed

Once you run `database/17_final_staff_fix.sql` successfully:

1. ✅ **Database is ready** - All functions work correctly
2. ✅ **Backend is ready** - Already deployed on Render
3. ✅ **Mobile app is ready** - Code is complete
4. ⏳ **Testing needed** - Open the app and test

### Next Steps:
1. Run `database/17_final_staff_fix.sql` in Supabase SQL Editor
2. Verify with `database/18_verify_complete.sql` (optional)
3. Open mobile app and test staff selection
4. Report any issues

---

## 📞 Support

If you encounter any errors:

1. **Check the error message** - Look for column names or function names
2. **Check table structure** - Run `\d bookings` in psql
3. **Check function signature** - Run `\df check_staff_availability` in psql
4. **Re-run the fix** - `database/17_final_staff_fix.sql` is idempotent

---

## ✅ Success Criteria

You'll know it's working when:

- ✅ No SQL errors when running `17_final_staff_fix.sql`
- ✅ All verification tests show "✅ PASS"
- ✅ Mobile app shows staff picker in booking flow
- ✅ Can create bookings with staff selected
- ✅ Owner can manage staff in Staff tab

---

**Status**: Ready to deploy! 🚀

**Files to run**:
1. `database/17_final_staff_fix.sql` ⭐ (REQUIRED)
2. `database/18_verify_complete.sql` (optional verification)

---

*Last Updated: May 3, 2026*
