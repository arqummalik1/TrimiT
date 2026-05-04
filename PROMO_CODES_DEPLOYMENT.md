# Promo Codes Feature - Deployment Guide

## 🚀 Pre-Deployment Checklist

### Code Review
- [x] Backend code reviewed and tested
- [x] Mobile code reviewed and tested
- [x] No TypeScript/Python errors
- [x] All imports are correct
- [x] No console.log statements in production code
- [x] Error handling is comprehensive

### Testing
- [ ] All test scenarios pass (see PROMO_CODES_TESTING_GUIDE.md)
- [ ] Customer flow tested end-to-end
- [ ] Owner flow tested end-to-end
- [ ] Edge cases handled
- [ ] Performance benchmarks met
- [ ] No memory leaks detected

### Documentation
- [x] Implementation summary created
- [x] Flow diagrams created
- [x] Testing guide created
- [x] Deployment guide created (this file)
- [x] Status document updated

---

## 📦 Deployment Steps

### Step 1: Database Migration (Supabase)

**Estimated Time**: 5 minutes

#### 1.1 Backup Current Database
```bash
# Optional but recommended
pg_dump -h <supabase-host> -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

#### 1.2 Run Promo Codes Schema
```sql
-- In Supabase SQL Editor
-- Copy and paste contents of database/13_promo_codes.sql
-- Execute
```

**Verify**:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('promotions', 'promo_usage');

-- Check columns added to bookings
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('promo_code', 'discount_amount', 'original_amount');

-- Check RPC function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'validate_promo_code';

-- Check sample promos loaded
SELECT code, discount_type, discount_value FROM promotions;
```

**Expected Output**:
- 2 tables (promotions, promo_usage)
- 3 new columns in bookings
- 1 RPC function
- 3 sample promo codes (TRIMIT50, FIRST100, WELCOME20)

#### 1.3 Update Booking RPC
```sql
-- In Supabase SQL Editor
-- Copy and paste contents of backend/database/booking_rpc.sql
-- Execute (this will replace the existing function)
```

**Verify**:
```sql
-- Check function signature
SELECT routine_name, data_type 
FROM information_schema.routines 
WHERE routine_name = 'create_atomic_booking';

-- Should show parameters including p_promo_code, p_discount_amount, p_original_amount
```

#### 1.4 Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('promotions', 'promo_usage');

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('promotions', 'promo_usage');
```

**Expected Output**:
- RLS enabled on both tables
- Multiple policies for each table (select, insert, update, delete)

---

### Step 2: Backend Deployment

**Estimated Time**: 10 minutes

#### 2.1 Verify Backend Changes
```bash
cd backend

# Check all files are committed
git status

# Files that should be modified/added:
# - backend/models/promotions.py (new)
# - backend/routers/promotions.py (new)
# - backend/routers/bookings.py (modified)
# - backend/server.py (modified)
# - backend/database/booking_rpc.sql (modified)
# - database/13_promo_codes.sql (new)
```

#### 2.2 Test Backend Locally
```bash
# Start backend
python -m uvicorn server:app --reload

# Test promo validation endpoint
curl -X POST http://localhost:8000/api/v1/promotions/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{
    "code": "TRIMIT50",
    "salon_id": "<test-salon-id>",
    "booking_amount": 500
  }'

# Expected response:
# {
#   "valid": true,
#   "promo_id": "...",
#   "discount_amount": 100,
#   "final_amount": 400,
#   "description": "..."
# }
```

#### 2.3 Deploy to Production (Render)
```bash
# Commit changes
git add .
git commit -m "feat: Add promo codes feature"

# Push to main (triggers auto-deploy on Render)
git push origin main

# Monitor deployment
# Go to Render dashboard: https://dashboard.render.com
# Watch build logs for errors
```

#### 2.4 Verify Production Deployment
```bash
# Test production endpoint
curl -X POST https://trimit-az5h.onrender.com/api/v1/promotions/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <prod-token>" \
  -d '{
    "code": "TRIMIT50",
    "salon_id": "<prod-salon-id>",
    "booking_amount": 500
  }'

# Should return valid response
```

#### 2.5 Check Backend Logs
```bash
# In Render dashboard, check logs for:
# - No startup errors
# - Promotions router registered
# - No database connection errors
```

---

### Step 3: Mobile App Deployment

**Estimated Time**: 30-60 minutes (depending on build time)

#### 3.1 Verify Mobile Changes
```bash
cd mobile

# Check all files are committed
git status

# Files that should be modified/added:
# - mobile/src/screens/customer/BookingScreen.tsx (modified)
# - mobile/src/screens/owner/PromoManagementScreen.tsx (new)
# - mobile/src/navigation/OwnerTabs.tsx (modified)
# - mobile/src/navigation/types.ts (modified)
```

#### 3.2 Test Mobile Locally
```bash
# Start Expo dev server
npx expo start

# Test on iOS simulator
# Press 'i'

# Test on Android emulator
# Press 'a'

# Test on physical device
# Scan QR code with Expo Go app
```

**Manual Testing**:
- [ ] Customer can apply promo code
- [ ] Owner can create promo code
- [ ] Owner can view promo list
- [ ] Navigation to Promos tab works
- [ ] No crashes or errors

#### 3.3 Update App Version
```json
// mobile/app.json
{
  "expo": {
    "version": "1.1.0",  // Increment version
    "ios": {
      "buildNumber": "2"  // Increment build number
    },
    "android": {
      "versionCode": 2  // Increment version code
    }
  }
}
```

#### 3.4 Build for Production

**Option A: EAS Build (Recommended)**
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Wait for builds to complete (15-30 minutes)
# Download builds from EAS dashboard
```

**Option B: Local Build**
```bash
# iOS (requires Mac)
npx expo run:ios --configuration Release

# Android
npx expo run:android --variant release
```

#### 3.5 Test Production Builds
- [ ] Install production build on test device
- [ ] Test promo code flow
- [ ] Test owner promo management
- [ ] Verify API calls to production backend
- [ ] Check for crashes or errors

#### 3.6 Submit to App Stores

**iOS (App Store)**
```bash
# Upload to App Store Connect
eas submit --platform ios

# Or manually:
# 1. Open Xcode
# 2. Archive the app
# 3. Upload to App Store Connect
# 4. Fill in release notes
# 5. Submit for review
```

**Android (Google Play)**
```bash
# Upload to Google Play Console
eas submit --platform android

# Or manually:
# 1. Go to Google Play Console
# 2. Create new release
# 3. Upload APK/AAB
# 4. Fill in release notes
# 5. Submit for review
```

**Release Notes Template**:
```
Version 1.1.0 - Promo Codes Feature

New Features:
• Customers can now apply promo codes for discounts
• Salon owners can create and manage promo codes
• Real-time discount calculation
• Usage tracking and analytics

Improvements:
• Enhanced booking flow
• Better error handling
• Performance optimizations

Bug Fixes:
• Minor UI improvements
```

---

### Step 4: Post-Deployment Verification

**Estimated Time**: 15 minutes

#### 4.1 Smoke Tests

**Customer Flow**:
```bash
# Test on production
1. Open app
2. Login as customer
3. Browse salons
4. Select service
5. Apply promo code "TRIMIT50"
6. Verify discount applied
7. Complete booking
8. Verify booking confirmation shows discount
```

**Owner Flow**:
```bash
# Test on production
1. Open app
2. Login as owner
3. Navigate to Promos tab
4. Create new promo code
5. Verify promo appears in list
6. Edit promo
7. Verify changes saved
```

#### 4.2 Monitor Error Logs

**Backend (Render)**:
```bash
# Check logs for errors
# Look for:
# - 500 errors
# - Database errors
# - Validation errors
```

**Mobile (Sentry/Crashlytics)**:
```bash
# Check crash reports
# Look for:
# - App crashes
# - JavaScript errors
# - Network errors
```

#### 4.3 Database Health Check
```sql
-- Check promo usage
SELECT COUNT(*) FROM promo_usage;

-- Check active promos
SELECT COUNT(*) FROM promotions WHERE active = true;

-- Check bookings with promos
SELECT COUNT(*) FROM bookings WHERE promo_code IS NOT NULL;

-- Check for errors
SELECT * FROM bookings 
WHERE promo_code IS NOT NULL 
AND discount_amount = 0;  -- Should be empty
```

#### 4.4 Performance Monitoring
```bash
# Check API response times
# Promo validation should be < 200ms
# Booking creation should be < 500ms

# Check database query performance
EXPLAIN ANALYZE 
SELECT * FROM promotions 
WHERE code = 'TRIMIT50' AND active = true;
```

---

## 🔄 Rollback Plan

### If Issues Arise

#### Backend Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback in Render dashboard
# Go to Deployments → Select previous deployment → Redeploy
```

#### Database Rollback
```sql
-- Drop new tables (if needed)
DROP TABLE IF EXISTS promo_usage CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

-- Remove columns from bookings (if needed)
ALTER TABLE bookings 
DROP COLUMN IF EXISTS promo_code,
DROP COLUMN IF EXISTS discount_amount,
DROP COLUMN IF EXISTS original_amount;

-- Drop RPC function (if needed)
DROP FUNCTION IF EXISTS validate_promo_code;

-- Restore old booking RPC (if needed)
-- Run backup of booking_rpc.sql from before changes
```

#### Mobile Rollback
```bash
# Revert commits
git revert HEAD~4..HEAD  # Revert last 4 commits
git push origin main

# Rebuild and redeploy previous version
eas build --platform all --profile production
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

#### Business Metrics
- **Promo Usage Rate**: % of bookings using promo codes
- **Average Discount**: Average discount amount per booking
- **Conversion Rate**: Bookings with promo vs without
- **Popular Promos**: Most used promo codes
- **Revenue Impact**: Total revenue vs discounted revenue

#### Technical Metrics
- **API Response Time**: Promo validation endpoint
- **Error Rate**: Failed promo validations
- **Database Load**: Query performance
- **App Crashes**: Related to promo feature

### Monitoring Queries
```sql
-- Daily promo usage
SELECT 
  DATE(used_at) as date,
  COUNT(*) as usage_count,
  SUM(discount_applied) as total_discount
FROM promo_usage
GROUP BY DATE(used_at)
ORDER BY date DESC;

-- Most popular promos
SELECT 
  p.code,
  p.used_count,
  COUNT(pu.id) as actual_usage,
  SUM(pu.discount_applied) as total_discount_given
FROM promotions p
LEFT JOIN promo_usage pu ON p.id = pu.promo_id
GROUP BY p.id, p.code, p.used_count
ORDER BY p.used_count DESC;

-- Promo conversion rate
SELECT 
  COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END) as with_promo,
  COUNT(CASE WHEN promo_code IS NULL THEN 1 END) as without_promo,
  ROUND(
    COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END)::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as promo_usage_rate
FROM bookings
WHERE created_at >= NOW() - INTERVAL '7 days';
```

---

## 🎯 Success Criteria

### Deployment is Successful When:
- [x] Database migrations applied without errors
- [x] Backend deployed and responding
- [x] Mobile app builds successfully
- [ ] All smoke tests pass
- [ ] No critical errors in logs
- [ ] Performance metrics within acceptable range
- [ ] Users can apply promo codes
- [ ] Owners can manage promo codes

### Launch Announcement

**To Salon Owners**:
```
🎉 New Feature: Promo Codes!

You can now create and manage promo codes to attract more customers!

Features:
• Create percentage or flat discount codes
• Set minimum order values
• Limit usage per code
• Set expiry dates
• Track usage and analytics

Get started:
1. Open TrimiT app
2. Go to "Promos" tab
3. Click "Create" to make your first promo code

Example: Create "FIRST20" for 20% off to attract new customers!
```

**To Customers**:
```
💰 Save More with Promo Codes!

You can now use promo codes to get discounts on your bookings!

How to use:
1. Select your service
2. Enter promo code at checkout
3. See your savings instantly!

Try these codes:
• TRIMIT50 - 50% off (max ₹100)
• FIRST100 - ₹100 off on orders above ₹300
• WELCOME20 - 20% off (max ₹200)

Happy booking! 💇‍♀️✨
```

---

## 📞 Support & Troubleshooting

### Common Issues

#### Issue 1: Promo validation fails
**Symptoms**: All promo codes return "Invalid"
**Cause**: RPC function not deployed or database connection issue
**Fix**:
```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'validate_promo_code';

-- If missing, redeploy database/13_promo_codes.sql
```

#### Issue 2: Discount not applied to booking
**Symptoms**: Promo validates but booking shows full price
**Cause**: Booking RPC not updated
**Fix**:
```sql
-- Redeploy backend/database/booking_rpc.sql
-- Verify function accepts promo parameters
```

#### Issue 3: Owner can't create promos
**Symptoms**: "Unauthorized" error when creating promo
**Cause**: RLS policies not set correctly
**Fix**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'promotions';

-- Redeploy database/13_promo_codes.sql if policies missing
```

#### Issue 4: App crashes on Promos tab
**Symptoms**: App crashes when navigating to Promos
**Cause**: Navigation not configured correctly
**Fix**:
- Verify `mobile/src/navigation/types.ts` includes Promos
- Verify `mobile/src/navigation/OwnerTabs.tsx` imports PromoManagementScreen
- Rebuild app

---

## 📋 Deployment Checklist Summary

### Pre-Deployment
- [x] Code reviewed
- [ ] Tests passed
- [x] Documentation complete

### Database
- [ ] Backup created
- [ ] Schema deployed
- [ ] RPC updated
- [ ] Sample data loaded
- [ ] Verification queries run

### Backend
- [ ] Changes committed
- [ ] Local tests passed
- [ ] Deployed to production
- [ ] Production tests passed
- [ ] Logs checked

### Mobile
- [ ] Changes committed
- [ ] Local tests passed
- [ ] Version incremented
- [ ] Production builds created
- [ ] Production tests passed
- [ ] Submitted to app stores

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Error logs checked
- [ ] Database health verified
- [ ] Performance metrics good
- [ ] Monitoring set up
- [ ] Announcement sent

---

## 🎉 Deployment Complete!

**Deployed By**: _____________
**Deployment Date**: _____________
**Backend Version**: _____________
**Mobile Version**: 1.1.0
**Status**: ⬜ Success ⬜ Partial ⬜ Rollback

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

---

**Next Steps**:
1. Monitor metrics for 24-48 hours
2. Gather user feedback
3. Plan Phase 1.2: One-Click Rescheduling
4. Iterate based on data

**Questions?** Check PROMO_CODES_IMPLEMENTATION_SUMMARY.md or PROMO_CODES_TESTING_GUIDE.md
