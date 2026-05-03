# 🧪 TrimiT Testing Guide - Quick Start

**Purpose**: Test the app locally before deployment  
**Time**: 30-45 minutes  
**Status**: Ready to test

---

## 🚀 QUICK START (5 minutes)

### Step 1: Start Backend (if testing locally)

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python server.py

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start Mobile App

```bash
# Terminal 2: Mobile
cd mobile
npx expo start -c

# You should see:
# Metro waiting on exp://192.168.x.x:8081
# Press 'i' for iOS or 'a' for Android
```

### Step 3: Open App

```bash
# Press 'i' for iOS simulator (Mac only)
# or
# Press 'a' for Android emulator
# or
# Scan QR code with Expo Go app on your phone
```

---

## ✅ TESTING CHECKLIST

### 🎯 Phase 1 Features (Already Deployed)

#### Promo Codes
- [ ] Apply valid promo code
- [ ] See discount in summary
- [ ] Remove promo code
- [ ] Try invalid promo code
- [ ] Try expired promo code

#### Rescheduling
- [ ] Reschedule a booking
- [ ] Select new date/time
- [ ] Confirm reschedule
- [ ] View reschedule history

### 🆕 Phase 2.1 Features (NEW - Test These!)

#### Customer: Staff Selection
- [ ] **Book with "Any Available"** (Default)
  1. Select service
  2. Select date
  3. Select time slot
  4. ✅ Staff picker appears
  5. ✅ "Any Available" is selected by default
  6. Continue to payment
  7. Confirm booking
  8. ✅ Booking created with any_staff=true

- [ ] **Book with Specific Staff**
  1. Select service
  2. Select date
  3. Select time slot
  4. ✅ Staff picker appears
  5. ✅ Tap on a staff member (e.g., "Rahul Kumar")
  6. ✅ See price update if staff has custom pricing
  7. ✅ See staff name in booking summary
  8. Continue to payment
  9. Confirm booking
  10. ✅ Booking created with staff_id

- [ ] **View Staff Profile**
  1. In staff picker
  2. ✅ Tap on a staff member card
  3. ✅ Modal opens with:
     - Photo/avatar
     - Name and rating
     - Bio
     - Services list
     - Working hours
     - Contact info
  4. ✅ Tap "Select This Stylist"
  5. ✅ Modal closes, staff selected
  6. Continue booking

- [ ] **Premium Pricing**
  1. Select a staff with premium pricing
  2. ✅ See "+₹50" or "+₹100" badge
  3. ✅ See "Premium" label
  4. ✅ Price updates in summary
  5. Confirm booking
  6. ✅ Charged correct amount

- [ ] **Discount Pricing**
  1. Select a staff with discount pricing
  2. ✅ See "-₹50" badge
  3. ✅ See "Discount" label
  4. ✅ Price updates in summary
  5. Confirm booking
  6. ✅ Charged correct amount

- [ ] **No Staff Available**
  1. Select a time when no staff is available
  2. ✅ See "No staff available" message
  3. ✅ See helpful message to select different time
  4. Select different time
  5. ✅ Staff picker appears with available staff

#### Owner: Staff Management
- [ ] **View Staff List**
  1. Login as owner
  2. ✅ Go to "Staff" tab (new tab in bottom navigation)
  3. ✅ See list of staff members
  4. ✅ See summary stats (Active, Bookings, Avg Rating)
  5. ✅ See filter buttons (All/Active/Inactive)
  6. ✅ See sort buttons (Rating/Bookings/Name)

- [ ] **Filter Staff**
  1. Tap "All" filter
  2. ✅ See all staff (active + inactive)
  3. Tap "Active" filter
  4. ✅ See only active staff
  5. Tap "Inactive" filter
  6. ✅ See only inactive staff

- [ ] **Sort Staff**
  1. Tap "Rating" sort
  2. ✅ Staff sorted by rating (highest first)
  3. Tap "Bookings" sort
  4. ✅ Staff sorted by bookings (most first)
  5. Tap "Name" sort
  6. ✅ Staff sorted alphabetically

- [ ] **Add New Staff**
  1. ✅ Tap FAB (+ button) at bottom right
  2. ✅ Modal opens with form
  3. Fill in:
     - Name: "Test Staff"
     - Bio: "Expert stylist"
     - Phone: "+919876543210"
     - Email: "test@example.com"
  4. ✅ Select services (tap multiple)
  5. ✅ Expand "Working Hours"
  6. ✅ Try preset "9-5 Weekdays"
  7. ✅ Tap "Create"
  8. ✅ See success message
  9. ✅ See new staff in list

- [ ] **Edit Staff**
  1. ✅ Tap edit icon (✏️) on a staff card
  2. ✅ Modal opens with existing data
  3. Change name to "Updated Name"
  4. ✅ Tap "Update"
  5. ✅ See success message
  6. ✅ See updated name in list

- [ ] **Working Hours Editor**
  1. In staff form
  2. ✅ Expand "Working Hours"
  3. ✅ Toggle Monday off
  4. ✅ See Monday disabled
  5. ✅ Toggle Monday back on
  6. ✅ Change start time to 10:00
  7. ✅ Change end time to 19:00
  8. ✅ Tap copy icon
  9. ✅ See all days updated to 10:00-19:00
  10. ✅ Try preset "10-7 Mon-Sat"
  11. ✅ See hours updated

- [ ] **Deactivate Staff**
  1. ✅ Tap delete icon (🗑️) on a staff card
  2. ✅ See confirmation dialog
  3. ✅ Tap "Deactivate"
  4. ✅ See success message
  5. ✅ Staff marked as inactive (grayed out)
  6. Filter by "Inactive"
  7. ✅ See deactivated staff

- [ ] **View Staff Profile (Owner)**
  1. ✅ Tap on a staff card
  2. ✅ Modal opens with full profile
  3. ✅ See all details
  4. ✅ Close modal

- [ ] **Pull to Refresh**
  1. Pull down on staff list
  2. ✅ See loading indicator
  3. ✅ List refreshes

---

## 🐛 EDGE CASES TO TEST

### Network Errors
- [ ] Turn off WiFi
- [ ] Try to load staff list
- [ ] ✅ See error message
- [ ] Turn on WiFi
- [ ] Pull to refresh
- [ ] ✅ Data loads

### Validation
- [ ] Try to create staff without name
- [ ] ✅ See "Name is required" error
- [ ] Try invalid phone number
- [ ] ✅ See "Invalid phone number" error
- [ ] Try invalid email
- [ ] ✅ See "Invalid email" error
- [ ] Try to create staff without services
- [ ] ✅ See "Select at least one service" error

### Concurrent Bookings
- [ ] Open app on two devices
- [ ] Both select same staff, same slot
- [ ] First device confirms
- [ ] Second device tries to confirm
- [ ] ✅ See "Staff not available" error
- [ ] ✅ Slot refreshes

### Empty States
- [ ] Filter by "Inactive" when no inactive staff
- [ ] ✅ See "No inactive staff members" message
- [ ] Select time when no staff available
- [ ] ✅ See "No staff available" message

---

## 📊 PERFORMANCE CHECKS

### Load Times
- [ ] Staff list loads in < 2 seconds
- [ ] Staff picker loads in < 1 second
- [ ] Staff profile opens in < 500ms
- [ ] Booking creation completes in < 3 seconds

### Smooth Animations
- [ ] Staff picker scrolls smoothly
- [ ] Modal animations are smooth
- [ ] No lag when selecting staff
- [ ] No lag when filtering/sorting

### Memory Usage
- [ ] App doesn't crash after 10 minutes of use
- [ ] No memory leaks (check with dev tools)
- [ ] Smooth performance throughout

---

## 🎯 CRITICAL PATH TEST (10 minutes)

**Complete Booking Flow with Staff Selection**:

1. ✅ Open app
2. ✅ Login as customer
3. ✅ Browse salons
4. ✅ Select "Luxury Salon"
5. ✅ Select "Haircut" service
6. ✅ Select tomorrow's date
7. ✅ Select "2:00 PM" slot
8. ✅ **Staff picker appears**
9. ✅ **See 3 staff members + "Any Available"**
10. ✅ **Tap on "Rahul Kumar" (⭐4.8)**
11. ✅ **See price update to ₹350 (+₹50 premium)**
12. ✅ Apply promo code "TRIMIT50"
13. ✅ See discount applied
14. ✅ Select "Cash at Salon"
15. ✅ Review summary:
    - Date: Tomorrow
    - Time: 2:00 PM
    - **Stylist: Rahul Kumar** ← NEW!
    - Original: ₹350
    - Discount: -₹175
    - Total: ₹175
16. ✅ Tap "Confirm Booking"
17. ✅ See success screen
18. ✅ Go to "My Bookings"
19. ✅ **See booking with staff name**
20. ✅ **SUCCESS!** 🎉

---

## 🔍 WHAT TO LOOK FOR

### ✅ Good Signs
- Staff picker appears after slot selection
- "Any Available" is selected by default
- Staff cards show photos, ratings, reviews
- Premium/discount badges are clear
- Price updates when staff selected
- Booking summary shows selected staff
- Owner can manage staff easily
- Working hours editor is intuitive
- No crashes or errors

### ❌ Bad Signs
- Staff picker doesn't appear
- No staff shown (when they should be)
- Price doesn't update
- Crashes when selecting staff
- Slow loading (> 3 seconds)
- Errors in console
- UI looks broken
- Can't create/edit staff

---

## 📝 BUG REPORT TEMPLATE

If you find a bug, report it like this:

```
**Bug**: Staff picker doesn't appear

**Steps to Reproduce**:
1. Login as customer
2. Select service
3. Select date
4. Select time slot
5. Staff picker should appear but doesn't

**Expected**: Staff picker appears with available staff
**Actual**: Nothing happens, no staff picker

**Environment**:
- Device: iPhone 14 Pro
- OS: iOS 17.0
- App Version: 1.2.0
- Network: WiFi

**Console Logs**:
[Paste any error messages from console]

**Screenshots**:
[Attach screenshots if helpful]
```

---

## ✅ TESTING COMPLETE!

### If All Tests Pass:
- ✅ App is ready for deployment
- ✅ Proceed with deployment guide
- ✅ Deploy to production

### If Tests Fail:
- ❌ Document bugs
- ❌ Fix issues
- ❌ Re-test
- ❌ Repeat until all pass

---

## 🎉 READY TO DEPLOY?

If you've completed all tests and everything works:

1. ✅ All customer flows work
2. ✅ All owner flows work
3. ✅ Edge cases handled
4. ✅ Performance is good
5. ✅ No critical bugs

**Then you're ready!** 🚀

Proceed to `DEPLOYMENT_GUIDE.md` for deployment steps.

---

**Testing Guide Version**: 1.0  
**Last Updated**: May 3, 2026  
**Status**: Ready to test ✅
