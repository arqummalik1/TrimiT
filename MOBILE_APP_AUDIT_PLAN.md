# Mobile App Comprehensive Audit & Fix Plan

## Executive Summary
**Status**: Backend deployed ✅ | Mobile app has critical issues ❌
**Priority**: HIGH - Salon creation failing, UI/UX issues with bottom navigation

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### 1. **Salon Creation Failure** (HIGHEST PRIORITY)
**Symptom**: "An error occurred" when creating salon
**Root Cause Analysis**:
- API endpoint: `POST /api/v1/salons/`
- Request signature generation may be failing
- Backend route might not exist or have issues
- Network/CORS issues possible

**Investigation Steps**:
1. Check if backend `/api/v1/salons` POST endpoint exists
2. Verify request signature generation in `security.ts`
3. Test API directly with curl/Postman
4. Check backend logs for actual error
5. Verify authentication token is being sent

**Files to Audit**:
- `mobile/src/services/salonService.ts` (line 13-15)
- `mobile/src/lib/security.ts` (signature generation)
- `mobile/src/services/apiClient.ts` (interceptors)
- `backend/routers/salons.py` (POST endpoint)

---

### 2. **Bottom Navigation Overcrowding** (HIGH PRIORITY)
**Current State**: 6 tabs in bottom navigation
- Dashboard
- Bookings
- Services
- Staff
- Promos
- Settings

**Required State**: 4 tabs maximum
**Solution**:
- Keep: Dashboard, Bookings, Services, Settings
- Move to Settings: Staff Management, Promo Management

**User Requirements**:
- Settings must be accessible even without salon created
- Light/Dark mode toggle must work without salon
- Salon-specific settings disabled until salon created

---

## 📋 COMPLETE AUDIT CHECKLIST

### A. Backend API Endpoints Verification

#### Authentication Endpoints
- [ ] `POST /api/v1/auth/signup` - Test signup flow
- [ ] `POST /api/v1/auth/login` - Test login flow
- [ ] `POST /api/v1/auth/forgot-password` - Test password reset

#### Salon Endpoints
- [ ] `GET /api/v1/salons/` - List salons (with location params)
- [ ] `POST /api/v1/salons/` - **CREATE SALON (FAILING)**
- [ ] `GET /api/v1/salons/{id}` - Get salon details
- [ ] `PATCH /api/v1/salons/{id}` - Update salon
- [ ] `GET /api/v1/owner/salon` - Get owner's salon
- [ ] `GET /api/v1/owner/analytics` - Get analytics

#### Services Endpoints
- [ ] `GET /api/v1/salons/{id}/services` - List services
- [ ] `POST /api/v1/salons/{id}/services` - Create service
- [ ] `PATCH /api/v1/services/{id}` - Update service
- [ ] `DELETE /api/v1/services/{id}` - Delete service

#### Bookings Endpoints
- [ ] `GET /api/v1/bookings/slots` - Get available slots
- [ ] `POST /api/v1/bookings/reserve` - Reserve slot
- [ ] `POST /api/v1/bookings/` - Create booking
- [ ] `GET /api/v1/bookings/` - List bookings
- [ ] `PATCH /api/v1/bookings/{id}` - Update booking
- [ ] `PATCH /api/v1/bookings/{id}/reschedule` - Reschedule booking

#### Staff Endpoints
- [ ] `GET /api/v1/staff/salon/{id}` - List salon staff
- [ ] `POST /api/v1/staff` - Create staff
- [ ] `GET /api/v1/staff/{id}` - Get staff details
- [ ] `PATCH /api/v1/staff/{id}` - Update staff
- [ ] `DELETE /api/v1/staff/{id}` - Delete staff
- [ ] `POST /api/v1/staff/services/assign` - Assign service to staff
- [ ] `GET /api/v1/staff/available/{salon_id}/{service_id}` - Get available staff

#### Promotions Endpoints
- [ ] `POST /api/v1/promotions/validate` - Validate promo code
- [ ] `POST /api/v1/promotions/` - Create promotion
- [ ] `GET /api/v1/promotions/` - List promotions
- [ ] `PATCH /api/v1/promotions/{id}` - Update promotion
- [ ] `DELETE /api/v1/promotions/{id}` - Delete promotion

#### Payments Endpoints
- [ ] `POST /api/v1/payments/create-order` - Create payment order
- [ ] `POST /api/v1/payments/verify` - Verify payment

---

### B. Mobile App Code Audit

#### Navigation Structure
- [ ] `mobile/src/navigation/OwnerTabs.tsx` - Reduce to 4 tabs
- [ ] `mobile/src/navigation/OwnerStack.tsx` - Verify stack navigation
- [ ] `mobile/src/navigation/CustomerTabs.tsx` - Check customer navigation
- [ ] `mobile/src/navigation/types.ts` - Update type definitions

#### Screens Audit
- [ ] `ManageSalonScreen.tsx` - Fix create salon flow
- [ ] `SettingsScreen.tsx` - Make accessible without salon
- [ ] `StaffManagementScreen.tsx` - Move to settings
- [ ] `PromoManagementScreen.tsx` - Move to settings
- [ ] `OwnerDashboardScreen.tsx` - Verify dashboard loads

#### Services & Repositories
- [ ] `salonService.ts` - Verify all methods
- [ ] `salonRepository.ts` - Check error handling
- [ ] `staffService.ts` - Verify staff operations
- [ ] `bookingService.ts` - Check booking flow
- [ ] `promotionService.ts` - Verify promo operations

#### Core Libraries
- [ ] `lib/api.ts` - Legacy wrapper audit
- [ ] `lib/security.ts` - **CRITICAL: Signature generation**
- [ ] `lib/errorHandler.ts` - Error normalization
- [ ] `lib/supabase.ts` - Supabase client config
- [ ] `services/apiClient.ts` - Axios interceptors

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Fix Critical Salon Creation Issue (2-3 hours)

#### Step 1.1: Backend Verification
```bash
# Test the endpoint directly
curl -X POST https://trimit-az5h.onrender.com/api/v1/salons/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Salon",
    "address": "123 Test St",
    "city": "Test City",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "phone": "+91 9876543210",
    "opening_time": "09:00",
    "closing_time": "21:00",
    "description": "Test",
    "images": []
  }'
```

#### Step 1.2: Check Backend Route
- File: `backend/routers/salons.py`
- Verify POST `/salons/` endpoint exists
- Check authentication requirements
- Verify request validation

#### Step 1.3: Fix Mobile Request Signature
- File: `mobile/src/lib/security.ts`
- Verify signature generation matches backend expectation
- Check timestamp format
- Ensure path format is correct

#### Step 1.4: Add Detailed Error Logging
- Add console.log in `salonService.createSalon`
- Log request payload before sending
- Log full error response
- Add try-catch with detailed error info

#### Step 1.5: Test & Verify
- Test salon creation in app
- Verify error messages are clear
- Check backend logs for requests
- Confirm salon appears in database

---

### Phase 2: Redesign Bottom Navigation (1-2 hours)

#### Step 2.1: Update OwnerTabs.tsx
**Remove from tabs**:
- Staff tab
- Promos tab

**Keep in tabs**:
- Dashboard
- Bookings
- Services
- Settings

#### Step 2.2: Update SettingsScreen.tsx
**Add new sections**:
```typescript
// Settings Screen Structure
- Account Settings (always accessible)
  - Profile
  - Theme (Light/Dark)
  - Notifications
  - Language

- Salon Management (disabled if no salon)
  - Edit Salon Details
  - Manage Staff → Navigate to StaffManagementScreen
  - Manage Promotions → Navigate to PromoManagementScreen
  - Working Hours
  - Images

- Legal & Support (always accessible)
  - Privacy Policy
  - Terms of Service
  - Contact Us
  - About
```

#### Step 2.3: Update Navigation Types
- Remove Staff and Promos from `OwnerTabParamList`
- Add Staff and Promos to `OwnerSettingsStackParamList`
- Update all screen props accordingly

#### Step 2.4: Create Settings Navigation Stack
```typescript
<SettingsStack.Navigator>
  <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
  <SettingsStack.Screen name="ManageSalon" component={ManageSalonScreen} />
  <SettingsStack.Screen name="StaffManagement" component={StaffManagementScreen} />
  <SettingsStack.Screen name="PromoManagement" component={PromoManagementScreen} />
  <SettingsStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
  <SettingsStack.Screen name="Terms" component={TermsScreen} />
  <SettingsStack.Screen name="Contact" component={ContactScreen} />
</SettingsStack.Navigator>
```

---

### Phase 3: Comprehensive API Testing (2-3 hours)

#### Step 3.1: Create API Test Suite
Create `mobile/src/__tests__/api.test.ts`:
```typescript
describe('API Endpoints', () => {
  describe('Authentication', () => {
    test('POST /auth/signup', async () => {});
    test('POST /auth/login', async () => {});
  });
  
  describe('Salons', () => {
    test('POST /salons/ - Create salon', async () => {});
    test('GET /salons/{id} - Get salon', async () => {});
    test('PATCH /salons/{id} - Update salon', async () => {});
  });
  
  // ... more tests
});
```

#### Step 3.2: Manual Testing Checklist
- [ ] Create account
- [ ] Login
- [ ] Create salon (CRITICAL)
- [ ] Update salon
- [ ] Add service
- [ ] Update service
- [ ] Delete service
- [ ] Add staff member
- [ ] Assign service to staff
- [ ] Create promotion
- [ ] Test booking flow
- [ ] Test payment flow

---

### Phase 4: Error Handling & UX Improvements (1-2 hours)

#### Step 4.1: Improve Error Messages
- Replace generic "An error occurred" with specific messages
- Add retry buttons for network errors
- Show validation errors clearly
- Add loading states everywhere

#### Step 4.2: Add Offline Support
- Check network status before API calls
- Queue failed requests
- Show offline banner
- Sync when back online

#### Step 4.3: Add Success Feedback
- Toast messages for all actions
- Haptic feedback on success
- Clear visual confirmation
- Auto-dismiss after 3 seconds

---

## 📊 TESTING MATRIX

### Critical User Flows

| Flow | Steps | Expected Result | Status |
|------|-------|----------------|--------|
| **Salon Creation** | 1. Login as owner<br>2. Navigate to create salon<br>3. Fill form<br>4. Submit | Salon created, redirected to dashboard | ❌ FAILING |
| **Service Management** | 1. Create salon<br>2. Add service<br>3. Edit service<br>4. Delete service | All CRUD operations work | ⚠️ UNTESTED |
| **Staff Management** | 1. Create salon<br>2. Add staff<br>3. Assign services<br>4. Update staff | Staff management works | ⚠️ UNTESTED |
| **Booking Flow** | 1. Customer finds salon<br>2. Selects service<br>3. Chooses slot<br>4. Completes booking | Booking created | ⚠️ UNTESTED |
| **Settings Access** | 1. Login without salon<br>2. Open settings<br>3. Toggle theme | Settings accessible | ⚠️ UNTESTED |

---

## 🎯 SUCCESS CRITERIA

### Must Have (P0)
- ✅ Salon creation works without errors
- ✅ Bottom navigation has 4 tabs only
- ✅ Settings accessible without salon
- ✅ All API endpoints return proper responses
- ✅ Error messages are clear and actionable

### Should Have (P1)
- ✅ All CRUD operations tested
- ✅ Offline handling implemented
- ✅ Loading states everywhere
- ✅ Success feedback on actions

### Nice to Have (P2)
- ✅ Automated API tests
- ✅ Performance optimization
- ✅ Analytics tracking
- ✅ Crash reporting

---

## 📁 FILES TO MODIFY

### High Priority
1. `mobile/src/navigation/OwnerTabs.tsx` - Remove 2 tabs
2. `mobile/src/screens/owner/SettingsScreen.tsx` - Redesign
3. `mobile/src/lib/security.ts` - Fix signature
4. `mobile/src/services/salonService.ts` - Add logging
5. `backend/routers/salons.py` - Verify endpoint

### Medium Priority
6. `mobile/src/navigation/types.ts` - Update types
7. `mobile/src/lib/errorHandler.ts` - Better errors
8. `mobile/src/components/Toast.tsx` - Improve feedback
9. `mobile/src/services/apiClient.ts` - Better logging

### Low Priority
10. Add API tests
11. Add error boundaries
12. Improve loading states
13. Add offline support

---

## 🚀 EXECUTION ORDER

1. **IMMEDIATE** (Next 30 minutes)
   - Test salon creation API with curl
   - Check backend logs
   - Identify exact error

2. **TODAY** (Next 4 hours)
   - Fix salon creation issue
   - Redesign bottom navigation
   - Update settings screen
   - Test all changes

3. **THIS WEEK** (Next 2 days)
   - Complete API testing
   - Fix any discovered issues
   - Improve error handling
   - Add success feedback

4. **NEXT WEEK** (Ongoing)
   - Add automated tests
   - Performance optimization
   - Polish UI/UX
   - Deploy to TestFlight

---

## 📝 NOTES

- Backend is deployed and healthy: https://trimit-az5h.onrender.com/health
- All environment variables are set correctly
- Database migrations are complete
- Focus on mobile app issues first
- Backend changes should be minimal

---

**Created**: May 4, 2026
**Last Updated**: May 4, 2026
**Status**: Ready for execution
