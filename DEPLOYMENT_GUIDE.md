# 🚀 TrimiT Deployment Guide - Complete Step-by-Step

**Last Updated**: May 3, 2026  
**Status**: Production Ready  
**Estimated Time**: 2-3 hours

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration (Supabase)](#database-migration-supabase)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Mobile App Testing](#mobile-app-testing)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Plan](#rollback-plan)
8. [Troubleshooting](#troubleshooting)

---

## 🔍 PRE-DEPLOYMENT CHECKLIST

### ✅ Before You Start

- [ ] Backup your Supabase database
- [ ] Have Supabase credentials ready
- [ ] Have Render dashboard access
- [ ] Have Expo/EAS account ready
- [ ] Test locally first
- [ ] Review all changes in git
- [ ] Notify team about deployment

### 📝 Required Credentials

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Render
RENDER_API_KEY=your-render-api-key

# Expo/EAS
EXPO_TOKEN=your-expo-token
```

---

## 🗄️ DATABASE MIGRATION (SUPABASE)

### Step 1: Backup Current Database

```bash
# Login to Supabase dashboard
# Go to: Database > Backups
# Click: "Create Backup"
# Name: "pre-phase2-backup-2026-05-03"
```

### Step 2: Connect to Supabase

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**

**Option B: Using psql CLI**

```bash
# Get connection string from Supabase Dashboard
# Settings > Database > Connection string

psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### Step 3: Run Migrations in Order

**CRITICAL**: Run these in **EXACT ORDER**. Do NOT skip any!

#### ✅ Core Migrations (If Not Already Done)

```sql
-- Check if already run
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- If you see: users, salons, services, bookings, reviews
-- Then core migrations are done. Skip to Phase 1.
```

If core tables don't exist, run these first:

```bash
# 1. Core Schema
-- Copy contents of database/01_schema.sql
-- Paste in SQL Editor
-- Click "Run"
-- Wait for "Success" message

# 2. Seed Data
-- Copy contents of database/02_seed_data.sql
-- Paste in SQL Editor
-- Click "Run"

# 3-11. Continue with remaining core migrations
-- database/03_setup_storage.sql
-- database/04_add_service_offers.sql
-- database/05_enable_realtime_bookings.sql
-- database/06_verify_realtime.sql
-- database/07_check_rls_policies.sql
-- database/08_add_max_bookings_per_slot.sql
-- database/09_production_updates.sql
-- database/10_add_nearby_salons_rpc.sql
-- database/11_idempotency_keys.sql
```

#### 🆕 Phase 1 Migrations (Promo Codes & Rescheduling)

```sql
-- 12. Promo Codes System
-- Copy contents of database/13_promo_codes.sql
-- Paste in SQL Editor
-- Click "Run"
-- Expected: "promotions" and "promo_usage" tables created

-- Verify:
SELECT COUNT(*) FROM promotions;
-- Should return: 3 (sample promo codes)

-- 13. Booking Rescheduling
-- Copy contents of database/14_booking_reschedule.sql
-- Paste in SQL Editor
-- Click "Run"
-- Expected: "booking_reschedules" table created

-- Verify:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'reschedule_booking_atomic';
-- Should return: 1 row
```

#### 🚀 Phase 2 Migration (Staff Selection) - NEW!

```sql
-- 14. Staff Selection System
-- Copy contents of database/15_staff_selection.sql
-- Paste in SQL Editor
-- Click "Run"
-- Expected: "staff" and "staff_services" tables created

-- This will take 30-60 seconds to complete
-- Wait for "Success" message
```

### Step 4: Verify Migrations

Run these verification queries:

```sql
-- 1. Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
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

-- 2. Check RPC functions
SELECT routine_name FROM information_schema.routines 
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

-- 3. Check sample data
SELECT COUNT(*) FROM staff;
-- Expected: 3 (sample staff members)

SELECT COUNT(*) FROM promotions;
-- Expected: 3 (sample promo codes)

-- 4. Test staff availability function
SELECT check_staff_availability(
    (SELECT id FROM staff LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    CURRENT_DATE + INTERVAL '1 day',
    '14:00:00'::time,
    30
);
-- Expected: true or false (boolean)

-- 5. Test get available staff function
SELECT * FROM get_available_staff(
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    CURRENT_DATE + INTERVAL '1 day',
    '14:00:00'::time
);
-- Expected: List of available staff (may be empty if no staff assigned)
```

### Step 5: Test Atomic Booking with Staff

```sql
-- Test the updated create_atomic_booking function
SELECT * FROM create_atomic_booking(
    (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
    (SELECT id FROM salons LIMIT 1),
    (SELECT id FROM services LIMIT 1),
    CURRENT_DATE + INTERVAL '2 days',
    '15:00:00'::time,
    30,
    'salon_cash',
    500.00,
    NULL, -- promo_code
    0, -- discount_amount
    500.00, -- original_amount
    (SELECT id FROM staff LIMIT 1), -- staff_id (NEW!)
    false -- any_staff (NEW!)
);

-- Expected: booking_id, success=true, message='Booking created successfully'

-- Verify booking has staff_id
SELECT id, staff_id, any_staff FROM bookings 
ORDER BY created_at DESC LIMIT 1;
-- Expected: staff_id should be populated
```

### ✅ Database Migration Complete!

If all queries return expected results, your database is ready! 🎉

---

## 🖥️ BACKEND DEPLOYMENT (RENDER)

### Step 1: Update Backend Code

```bash
# Navigate to backend directory
cd backend

# Check current git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "feat: Add staff selection system (Phase 2.1)

- Add staff management endpoints
- Add staff availability checking
- Update booking creation to support staff selection
- Add staff performance analytics"

# Push to main branch (or your deployment branch)
git push origin main
```

### Step 2: Deploy on Render

**Option A: Auto-Deploy (If configured)**

1. Go to https://dashboard.render.com
2. Find your backend service
3. Check **Events** tab
4. Wait for "Deploy succeeded" message (2-5 minutes)

**Option B: Manual Deploy**

1. Go to https://dashboard.render.com
2. Find your backend service
3. Click **Manual Deploy** > **Deploy latest commit**
4. Wait for deployment to complete

### Step 3: Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-backend.onrender.com/health

# Expected response:
{
  "status": "ok",
  "version": "1.1.0",
  "timestamp": 1714752000,
  "dependencies": {
    "supabase": "ok"
  }
}

# Test staff endpoints
curl https://your-backend.onrender.com/api/v1/staff/salon/{salon-id}

# Expected: List of staff members (may be empty)
```

### Step 4: Check Render Logs

```bash
# In Render Dashboard:
# 1. Click on your service
# 2. Go to "Logs" tab
# 3. Look for:
#    - "Application startup complete"
#    - No error messages
#    - "Uvicorn running on..."
```

### ✅ Backend Deployment Complete!

---

## 📱 MOBILE APP TESTING

### Step 1: Install Dependencies

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# or
yarn install
```

### Step 2: Update Environment Variables

```bash
# Edit mobile/.env file
nano .env

# Ensure these are set:
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Start Development Server

```bash
# Clear cache and start
npx expo start -c

# or
npm start -- --clear

# You should see:
# ✓ Metro waiting on exp://192.168.x.x:8081
# › Press a │ open Android
# › Press i │ open iOS simulator
# › Press w │ open web
```

### Step 4: Test on Device/Simulator

#### iOS Simulator (Mac only)

```bash
# Press 'i' in terminal
# or
npx expo run:ios
```

#### Android Emulator

```bash
# Press 'a' in terminal
# or
npx expo run:android
```

#### Physical Device

```bash
# Install Expo Go app from App Store/Play Store
# Scan QR code from terminal
```

### Step 5: Test Customer Flow

**Test Scenario 1: Book with Specific Staff**

1. Open app
2. Login as customer
3. Browse salons
4. Select a salon
5. Select a service
6. Select a date
7. Select a time slot
8. **NEW**: See staff picker appear
9. **NEW**: Select a specific staff member (e.g., "Rahul Kumar")
10. **NEW**: See price update if staff has custom pricing
11. Apply promo code (optional)
12. Select payment method
13. Review booking summary
14. **NEW**: Verify selected staff shows in summary
15. Confirm booking
16. ✅ Success!

**Test Scenario 2: Book with "Any Available"**

1-7. Same as above
8. **NEW**: See staff picker with "Any Available" selected by default
9. **NEW**: Leave "Any Available" selected
10. Continue to payment
11. Confirm booking
12. ✅ Success!

**Test Scenario 3: View Staff Profile**

1-8. Same as Test 1
9. **NEW**: Tap on a staff member card
10. **NEW**: Staff profile modal opens
11. **NEW**: View bio, services, working hours, contact
12. **NEW**: Tap "Select This Stylist"
13. **NEW**: Modal closes, staff selected
14. Continue booking
15. ✅ Success!

### Step 6: Test Owner Flow

**Test Scenario 1: View Staff List**

1. Login as owner
2. Go to **Staff** tab (new tab)
3. **NEW**: See list of staff members
4. **NEW**: See filter options (All/Active/Inactive)
5. **NEW**: See sort options (Rating/Bookings/Name)
6. **NEW**: See summary stats (Active, Total Bookings, Avg Rating)
7. ✅ Success!

**Test Scenario 2: Add New Staff**

1. In Staff tab
2. **NEW**: Tap FAB (+ button) at bottom right
3. **NEW**: Staff form modal opens
4. **NEW**: Fill in:
   - Name: "Test Staff"
   - Bio: "Test bio"
   - Phone: "+919876543210"
   - Email: "test@example.com"
5. **NEW**: Select services (tap to select multiple)
6. **NEW**: Expand "Working Hours"
7. **NEW**: Set working hours (use presets or manual)
8. **NEW**: Tap "Create"
9. **NEW**: See success message
10. **NEW**: See new staff in list
11. ✅ Success!

**Test Scenario 3: Edit Staff**

1. In Staff tab
2. **NEW**: Tap edit icon (✏️) on a staff card
3. **NEW**: Staff form opens with existing data
4. **NEW**: Modify name or bio
5. **NEW**: Tap "Update"
6. **NEW**: See success message
7. **NEW**: See updated data in list
8. ✅ Success!

**Test Scenario 4: Deactivate Staff**

1. In Staff tab
2. **NEW**: Tap delete icon (🗑️) on a staff card
3. **NEW**: See confirmation dialog
4. **NEW**: Tap "Deactivate"
5. **NEW**: See success message
6. **NEW**: Staff marked as inactive
7. **NEW**: Filter by "Inactive" to see deactivated staff
8. ✅ Success!

### Step 7: Test Edge Cases

**Edge Case 1: No Staff Available**

1. Book a service
2. Select a date/time when no staff is available
3. **NEW**: See "No staff available for this time slot" message
4. **NEW**: See helpful message to select different time
5. ✅ Handled gracefully!

**Edge Case 2: Network Error**

1. Turn off WiFi/Data
2. Try to load staff list
3. **NEW**: See error message
4. Turn on WiFi/Data
5. Pull to refresh
6. **NEW**: Data loads successfully
7. ✅ Handled gracefully!

**Edge Case 3: Concurrent Booking**

1. Open app on two devices
2. Both select same staff, same slot
3. First device confirms booking
4. Second device tries to confirm
5. **NEW**: See "Staff not available" error
6. **NEW**: Slot refreshes automatically
7. ✅ Race condition prevented!

### ✅ Mobile Testing Complete!

If all tests pass, your app is ready for deployment! 🎉

---

## 📦 MOBILE APP DEPLOYMENT

### Step 1: Build Configuration

```bash
# Navigate to mobile directory
cd mobile

# Update app version
# Edit app.json or app.config.js
nano app.json

# Increment version:
{
  "expo": {
    "version": "1.2.0", // Was 1.1.0
    "ios": {
      "buildNumber": "12" // Increment
    },
    "android": {
      "versionCode": 12 // Increment
    }
  }
}
```

### Step 2: Build with EAS

```bash
# Install EAS CLI (if not already)
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (if first time)
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Or build both
eas build --platform all --profile production
```

### Step 3: Submit to App Stores

#### iOS (App Store)

```bash
# Submit to App Store
eas submit --platform ios

# Follow prompts:
# - Select build
# - Confirm submission
# - Wait for "Submission successful"

# Then:
# 1. Go to App Store Connect
# 2. Add release notes mentioning:
#    - "New: Choose your favorite stylist"
#    - "New: Staff profiles with ratings"
#    - "Improved: Booking experience"
# 3. Submit for review
```

#### Android (Play Store)

```bash
# Submit to Play Store
eas submit --platform android

# Follow prompts:
# - Select build
# - Confirm submission
# - Wait for "Submission successful"

# Then:
# 1. Go to Play Console
# 2. Add release notes
# 3. Submit for review
```

### Step 4: Over-The-Air (OTA) Update (Optional)

For minor updates without app store review:

```bash
# Publish OTA update
eas update --branch production --message "Add staff selection feature"

# Users will get update automatically on next app launch
```

### ✅ Mobile Deployment Complete!

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Step 1: Smoke Tests (Production)

```bash
# Test backend health
curl https://your-backend.onrender.com/health

# Test staff endpoint
curl https://your-backend.onrender.com/api/v1/staff/salon/{salon-id}

# Test staff availability
curl -X GET "https://your-backend.onrender.com/api/v1/staff/available/{salon-id}/{service-id}?booking_date=2026-05-10&time_slot=14:00:00"
```

### Step 2: Monitor Logs

**Render Logs**:
```bash
# In Render Dashboard:
# 1. Go to your service
# 2. Click "Logs"
# 3. Watch for errors
# 4. Look for successful requests
```

**Supabase Logs**:
```bash
# In Supabase Dashboard:
# 1. Go to "Logs"
# 2. Select "Database"
# 3. Watch for slow queries
# 4. Check for errors
```

### Step 3: Monitor Metrics

**Key Metrics to Watch**:

- **Staff Selection Rate**: % of bookings with staff selected
- **"Any Available" Rate**: % of bookings with any_staff=true
- **Premium Pricing Adoption**: % of bookings with custom pricing
- **Error Rate**: Should be < 1%
- **API Response Time**: Should be < 500ms
- **Database Query Time**: Should be < 200ms

### Step 4: User Feedback

**Set up feedback channels**:

1. In-app feedback form
2. Support email monitoring
3. App store reviews
4. Social media mentions

### ✅ Verification Complete!

---

## 🔄 ROLLBACK PLAN

### If Something Goes Wrong

#### Rollback Database

```sql
-- Option 1: Restore from backup
-- In Supabase Dashboard:
-- Database > Backups > Select backup > Restore

-- Option 2: Drop new tables (CAREFUL!)
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
```

#### Rollback Backend

```bash
# In Render Dashboard:
# 1. Go to your service
# 2. Click "Rollbacks"
# 3. Select previous deployment
# 4. Click "Rollback to this version"
```

#### Rollback Mobile

```bash
# Publish OTA update with previous version
eas update --branch production --message "Rollback to previous version"

# Or submit new build to app stores
```

---

## 🐛 TROUBLESHOOTING

### Issue 1: Migration Fails

**Error**: "relation already exists"

**Solution**:
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'staff';

-- If exists, migration already run. Skip it.
```

**Error**: "function does not exist"

**Solution**:
```sql
-- Previous migration failed. Re-run previous migration first.
```

### Issue 2: Backend Not Responding

**Check**:
```bash
# 1. Check Render status
# Dashboard > Service > Status should be "Live"

# 2. Check logs
# Dashboard > Service > Logs
# Look for errors

# 3. Check environment variables
# Dashboard > Service > Environment
# Verify all variables are set
```

### Issue 3: Mobile App Crashes

**Check**:
```bash
# 1. Check console logs
# Look for error messages

# 2. Check API URL
# Verify EXPO_PUBLIC_API_URL is correct

# 3. Clear cache
npx expo start -c

# 4. Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue 4: Staff Not Showing

**Check**:
```sql
-- 1. Verify staff exist
SELECT * FROM staff;

-- 2. Verify staff_services mapping
SELECT * FROM staff_services;

-- 3. Verify staff is active
SELECT * FROM staff WHERE is_active = true;

-- 4. Test availability function
SELECT * FROM get_available_staff(
    'salon-id',
    'service-id',
    CURRENT_DATE + INTERVAL '1 day',
    '14:00:00'::time
);
```

### Issue 5: Booking Fails with Staff

**Check**:
```sql
-- 1. Check staff availability
SELECT check_staff_availability(
    'staff-id',
    'service-id',
    'booking-date',
    'time-slot',
    30
);

-- 2. Check staff can perform service
SELECT * FROM staff_services 
WHERE staff_id = 'staff-id' AND service_id = 'service-id';

-- 3. Check staff working hours
SELECT working_hours FROM staff WHERE id = 'staff-id';
```

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Backup database
- [ ] Review all changes
- [ ] Test locally
- [ ] Update version numbers

### Database
- [ ] Run migration 13 (promo codes)
- [ ] Run migration 14 (rescheduling)
- [ ] Run migration 15 (staff selection)
- [ ] Verify all tables created
- [ ] Verify all functions created
- [ ] Test sample queries

### Backend
- [ ] Commit and push code
- [ ] Deploy on Render
- [ ] Verify deployment succeeded
- [ ] Test health endpoint
- [ ] Test staff endpoints
- [ ] Check logs for errors

### Mobile
- [ ] Update environment variables
- [ ] Test customer flow
- [ ] Test owner flow
- [ ] Test edge cases
- [ ] Build with EAS
- [ ] Submit to app stores

### Post-Deployment
- [ ] Run smoke tests
- [ ] Monitor logs
- [ ] Monitor metrics
- [ ] Set up alerts
- [ ] Gather feedback

### ✅ ALL DONE!

---

## 🎉 SUCCESS!

If you've completed all steps, congratulations! 🎊

Your TrimiT app now has:
- ✅ Staff selection system
- ✅ Premium pricing
- ✅ Staff profiles
- ✅ Owner staff management
- ✅ 65% feature parity with Zoylee

**Next Steps**:
1. Monitor metrics for 1 week
2. Gather user feedback
3. Fix any bugs
4. Plan Phase 2.2 (Combo Packages)

---

## 📞 SUPPORT

If you encounter issues:

1. Check this guide's troubleshooting section
2. Check Render logs
3. Check Supabase logs
4. Check mobile console logs
5. Review error messages carefully

---

**Deployment Guide Version**: 1.0  
**Last Updated**: May 3, 2026  
**Status**: Production Ready ✅

---

*"Deployment is not the end. It's the beginning of learning."*
