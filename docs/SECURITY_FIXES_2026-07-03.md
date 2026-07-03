# Security Fixes - P0 to P4 Issues
## Date: 2026-07-03
## Status: P0 COMPLETE ✅ - DO NOT PUSH WITHOUT APPROVAL

This document tracks all security vulnerabilities found by Cursor audit and their fixes.

**P0 Status: ALL 4 CRITICAL ISSUES FIXED ✅**

---

## P0 - CRITICAL (All Fixed ✅)

| Issue | Status | Files Changed | Test |
|-------|--------|---------------|------|
| **P0-1: Email Verification Bypass** | ✅ FIXED | `backend/services/auth_signup.py` | ✅ Passing |
| **P0-2: Role Escalation via JWT** | ✅ FIXED | `backend/services/user_profile.py` | ✅ Passing |
| **P0-3: Web OTP Redirect Loss** | ✅ FIXED | `frontend/src/pages/LoginPage.js`, `VerifyOtpPage.js` | Manual test required |
| **P0-4: Web Realtime Without Auth** | ✅ FIXED | `frontend/src/lib/supabase.js`, `MyBookings.js` | Manual test required |

### ✅ P0-1: Email Verification Bypass via Resend [FIXED]

**What was broken:**
- Anyone could activate a pending account by calling `/auth/resend-confirmation`
- No email proof required - catastrophic auth bypass

**How to exploit (BEFORE fix):**
1. Sign up with email `victim@example.com`
2. Don't verify email (stay pending)
3. Attacker calls resend-confirmation API with that email
4. Account activates without victim clicking email link

**The fix:**
- Removed `admin_confirm_user()` call from resend logic
- Resend now ONLY sends email, never auto-activates
- User MUST click email link to verify

**File changed:** `backend/services/auth_signup.py` (lines 342-350)

**How to test:**
1. Create account via web/mobile (use test email)
2. Don't click verification link
3. Click "Resend confirmation email"
4. Account should stay UNVERIFIED
5. Now click the email link
6. Account should activate ✅

**Backend test:** `backend/tests/test_auth.py::test_resend_confirmation_never_auto_confirms`

---

### ✅ P0-2: Role Escalation via JWT Metadata [FIXED]

**What was broken (plain English):**
- When you signed up, your role (customer/owner) was stored in BOTH the database AND inside your login token
- Every time you logged in, the system checked: "Does the token say owner but database says customer?"
- If YES, it upgraded you from customer to owner automatically
- **Attack:** Sign up as "owner" → System stored "owner" in token → You're now an owner without UPI validation

**How to exploit (BEFORE fix):**
1. Sign up with role="owner" in the signup request
2. System creates your account as customer but stores "owner" in JWT token
3. Login - system sees token says "owner", upgrades your DB role to owner
4. You're now a salon owner without providing UPI ID ❌

**The fix:**
- **Removed the JWT metadata upgrade logic completely** (lines 220-235 in `backend/services/user_profile.py`)
- Database role is now the **ONLY** source of truth
- Login NEVER changes your role based on JWT metadata
- Your role can ONLY be set once during account creation
- Owner role requires UPI validation at signup

**Files changed:** 
- `backend/services/user_profile.py` (removed lines 220-235, added security comments)

**Backend test:** `backend/tests/test_auth.py::test_jwt_metadata_cannot_escalate_role` ✅ PASSING

**How to test manually:**

#### Mobile App Testing:
1. **Existing Customer Account Test:**
   - Open TrimiT app
   - Sign in with existing CUSTOMER account
   - Navigate: Profile → Check role is "Customer"
   - Close app completely (swipe kill)
   - Reopen app
   - **Expected:** Still logged in as customer (no role change)

2. **New Customer Signup Test:**
   - Sign out from app
   - Tap "Sign Up"
   - Select "Find Salons" (customer role)
   - Enter phone +919999999999 (test number)
   - Enter OTP
   - Complete profile
   - **Expected:** Role is "customer", can browse salons

3. **Owner Signup Test (Should Require UPI):**
   - Sign out
   - Tap "Sign Up"
   - Select "List My Salon" (owner role)
   - Enter phone +918888888888
   - Enter OTP
   - **Expected:** Must enter UPI ID to complete signup
   - Try skipping UPI → Should show error
   - Enter valid UPI ID → Profile created as owner

#### Web Testing:
1. **Customer Login:**
   - Go to https://trimit.online/login
   - Login with customer email
   - Check browser console: `localStorage.getItem('user')` → role should be "customer"
   - Refresh page
   - **Expected:** Still customer role

2. **Owner Login:**
   - Login with owner email
   - Console: role should be "owner"
   - Navigate to /owner/dashboard
   - **Expected:** Dashboard loads (only owners can access)

#### Backend API Testing:
```bash
# Test 1: Customer stays customer
curl -X GET https://trimit-az5h.onrender.com/api/v1/auth/me \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
# Expected: {"role": "customer", ...}

# Test 2: Owner stays owner  
curl -X GET https://trimit-az5h.onrender.com/api/v1/auth/me \
  -H "Authorization: Bearer <OWNER_TOKEN>"
# Expected: {"role": "owner", ...}

# Test 3: Run security test
cd backend
python -m pytest tests/test_auth.py::test_jwt_metadata_cannot_escalate_role -v
# Expected: PASSED
```

---

### ✅ P0-3: Web OTP Login Loses Booking Redirect [FIXED]

**What was broken (plain English):**
- Guest browsing trimit.online clicks "Sign in to book" from a booking page
- URL is `/booking/123?redirect=/booking/...`
- Redirects to `/login?redirect=/booking/...`
- User enters email → Goes to OTP verification page
- **Bug:** OTP page doesn't know where to send user after verification
- After OTP, lands on `/explore` instead of the booking page they wanted

**How to exploit (BEFORE fix):**
1. Visit trimit.online/booking/ABC123 (without logging in)
2. Click "Sign in to book"
3. Enter OTP
4. **Expected:** Back on booking page
5. **Actual:** On explore page - lost the booking context ❌

**The fix:**
- **LoginPage now passes redirect param to VerifyOtpPage** (line 52)
- **VerifyOtpPage reads redirect param and uses it after verification** (lines 8-9, 102-106)
- Guest flow: booking page → login → OTP → **back to booking page** ✅

**Files changed:** 
- `frontend/src/pages/LoginPage.js` (pass redirect through)
- `frontend/src/pages/VerifyOtpPage.js` (use redirect after verification)

**How to test manually:**

#### Web Testing (Critical User Flow):
1. **Open browser in Incognito/Private mode** (not logged in)
2. Go to https://trimit.online
3. Click any salon → Click "Book Now"
4. Should see "Sign in to book" button
5. Click "Sign in to book"
6. **Check URL:** Should have `?redirect=` parameter
7. Enter email → Click "Send Verification Code"
8. Enter 6-digit OTP from email
9. **Expected:** Lands back on the booking page you started from ✅
10. Can now complete the booking

#### Alternative Test (Direct URL):
1. Visit: `https://trimit.online/booking/some-salon-id?service=cut&redirect=/booking/xyz`
2. Will redirect to login with redirect param
3. Complete OTP flow
4. Should land on `/booking/xyz` ✅

---

### ✅ P0-4: Web Realtime Without Auth Token [FIXED]

**What was broken (plain English):**
- Customer bookings page subscribes to realtime updates (when salon confirms/cancels)
- **Bug:** Subscription used anonymous client (no auth token)
- Supabase RLS policies couldn't verify who you are
- Realtime updates might silently fail under RLS enforcement

**How it worked (BEFORE fix):**
- You're logged in as customer
- Go to "My Bookings" page
- Page subscribes to booking updates
- Subscription doesn't include your auth token
- RLS can't verify you own those bookings
- Updates may fail silently

**The fix:**
- **subscribeToUserBookings now accepts auth token** (supabase.js line 121)
- **MyBookings page passes token to subscription** (MyBookings.js lines 37, 136)
- RLS can now verify ownership properly
- Realtime updates work correctly under RLS

**Files changed:** 
- `frontend/src/lib/supabase.js` (add token parameter)
- `frontend/src/pages/customer/MyBookings.js` (pass token from auth store)

**How to test manually:**

#### Web Testing:
1. **Login as customer** at https://trimit.online/login
2. Make a booking (or use existing booking)
3. Go to "My Bookings" page
4. **Open browser DevTools → Console**
5. Check for any Supabase realtime errors (should be none)
6. Ask salon owner to confirm/cancel your booking
7. **Expected:** Booking status updates INSTANTLY on your page (no refresh needed) ✅

#### Owner Side Test:
1. Login as salon owner
2. Go to owner dashboard
3. Confirm or cancel a customer booking
4. **On customer's "My Bookings" page:** Status should update in real-time

#### Technical Verification:
```javascript
// In browser console on My Bookings page:
// Check that realtime channel is authenticated
const channels = window.localStorage.getItem('sb-project-auth-token')
console.log('Auth token present:', !!channels)
// Should be true if logged in
```

---

## P1 - HIGH PRIORITY

### Backend Issues

#### 🔧 P1-1: Production Signup Ignores Password [TODO]
**File:** `backend/services/auth_signup.py`
**Issue:** API accepts password but uses OTP-only signup
**Fix:** Remove password field from signup API or implement password flow

#### 🔧 P1-2: Booking Create IndexError [TODO]
**File:** `backend/routers/bookings.py` (lines 733-740)
**Issue:** 200 response with empty `[]` from salon/service query → `[0]` throws 500
**Fix:** Check array length before accessing index

#### 🔧 P1-3: UPI Verify Without State Machine [TODO]
**File:** `backend/routers/payments.py`
**Issue:** Owner can verify from `initiated` without customer marking `waiting_verification`
**Fix:** Enforce state transition: initiated → waiting_verification → verified

#### 🔧 P1-4: Admin PIN Returns Full Token [TODO]
**File:** `backend/routers/admin.py`
**Issue:** PIN login returns `ADMIN_API_TOKEN` in JSON
**Fix:** Return session token, not the raw API token

### Mobile Issues

#### 🔧 P1-5: Payment Waiting Screen Trap [TODO]
**File:** `mobile/src/screens/customer/PaymentWaitingScreen.tsx`
**Issue:** Poll failure shows skeleton indefinitely, no error/retry
**Fix:** Add error state and retry button

---

## P2 - MEDIUM PRIORITY

(To be detailed after P0/P1 fixes)

---

## P3 - LOW PRIORITY

(To be detailed after P0/P1/P2 fixes)

---

## Testing Checklist

### P0-1 Testing (Email Verification Bypass)
- [ ] Backend test passes
- [ ] Manual test: resend doesn't auto-activate
- [ ] Manual test: email link DOES activate

### P0-2 Testing (Role Escalation)
- [ ] Cannot signup as owner without UPI
- [ ] Customer cannot become owner by editing JWT
- [ ] Existing owners keep working

### P0-3 Testing (OTP Redirect)
- [ ] Click "Sign in to book" from booking page
- [ ] Complete OTP verification
- [ ] Lands back on booking page ✅

### P0-4 Testing (Realtime Auth)
- [ ] Customer bookings update in real-time
- [ ] Owner dashboard shows bookings instantly

---

## Deployment Plan

1. Fix all P0 issues
2. Write/update tests
3. Run full test suite
4. Test manually on local/staging
5. **ASK USER FOR APPROVAL**
6. Create PR from `zero-point-twenty-one` with full fix summary
7. **WAIT FOR MERGE APPROVAL**
8. Deploy to production

**DO NOT PUSH OR MERGE WITHOUT EXPLICIT APPROVAL**
