# Promo Codes - Testing Guide

## Quick Start Testing

### Prerequisites
1. Backend is running (local or production)
2. Mobile app is running (`npx expo start`)
3. Database migrations are applied
4. Sample promo codes are loaded

---

## Test Scenarios

### 🧪 Scenario 1: Valid Promo Code (Happy Path)

**Objective**: Apply a valid promo code and complete booking

**Steps**:
1. Login as customer
2. Browse salons and select a service (price ≥ ₹200)
3. Select date and time slot
4. Select payment method
5. Scroll to "Promo Code" section
6. Enter: `TRIMIT50`
7. Click "Apply"

**Expected Results**:
- ✅ Loading spinner appears briefly
- ✅ Success alert: "Promo Applied! You saved ₹100"
- ✅ Promo code field is replaced with green success banner
- ✅ Banner shows: "✓ TRIMIT50" with "You saved ₹100!"
- ✅ Booking summary updates:
  - Original Price: ₹500 (strikethrough)
  - Discount (TRIMIT50): -₹100 (green)
  - Total: ₹400 (bold)
- ✅ Confirm booking succeeds
- ✅ Booking confirmation shows discount

**Database Verification**:
```sql
-- Check booking record
SELECT promo_code, discount_amount, original_amount, total_amount
FROM bookings
WHERE id = '<booking_id>';
-- Should show: promo_code='TRIMIT50', discount_amount=100

-- Check promo usage
SELECT * FROM promo_usage
WHERE booking_id = '<booking_id>';
-- Should have 1 record

-- Check usage count incremented
SELECT used_count FROM promotions WHERE code = 'TRIMIT50';
-- Should be incremented by 1
```

---

### 🧪 Scenario 2: Invalid Promo Code

**Objective**: Handle invalid promo code gracefully

**Steps**:
1. Follow steps 1-5 from Scenario 1
2. Enter: `INVALID123`
3. Click "Apply"

**Expected Results**:
- ✅ Loading spinner appears briefly
- ✅ Red error message appears: "Invalid promo code"
- ✅ No success banner
- ✅ Booking summary shows original price only
- ✅ Can still complete booking without promo

---

### 🧪 Scenario 3: Expired Promo Code

**Objective**: Prevent use of expired promo codes

**Setup**:
```sql
-- Create expired promo
INSERT INTO promotions (id, code, discount_type, discount_value, expires_at, active)
VALUES (gen_random_uuid(), 'EXPIRED50', 'percent', 50, '2026-01-01', true);
```

**Steps**:
1. Follow steps 1-5 from Scenario 1
2. Enter: `EXPIRED50`
3. Click "Apply"

**Expected Results**:
- ✅ Red error message: "This promo code has expired"
- ✅ No discount applied

---

### 🧪 Scenario 4: Min Order Value Not Met

**Objective**: Enforce minimum order value

**Steps**:
1. Select a service with price < ₹200 (e.g., ₹150)
2. Follow booking flow
3. Enter: `TRIMIT50` (min order ₹200)
4. Click "Apply"

**Expected Results**:
- ✅ Red error message: "Minimum order value of ₹200 required"
- ✅ No discount applied

---

### 🧪 Scenario 5: Max Uses Reached

**Objective**: Prevent overuse of limited promo codes

**Setup**:
```sql
-- Set a promo to max uses
UPDATE promotions
SET max_uses = 5, used_count = 5
WHERE code = 'TRIMIT50';
```

**Steps**:
1. Follow steps 1-5 from Scenario 1
2. Enter: `TRIMIT50`
3. Click "Apply"

**Expected Results**:
- ✅ Red error message: "This promo code has reached its usage limit"
- ✅ No discount applied

**Cleanup**:
```sql
-- Reset for further testing
UPDATE promotions
SET max_uses = 100, used_count = 0
WHERE code = 'TRIMIT50';
```

---

### 🧪 Scenario 6: Remove Applied Promo

**Objective**: Allow users to remove promo and see original price

**Steps**:
1. Apply valid promo code (follow Scenario 1 steps 1-7)
2. Click the [×] button on the green success banner

**Expected Results**:
- ✅ Success banner disappears
- ✅ Promo code input field reappears (empty)
- ✅ Booking summary reverts to original price
- ✅ Can apply a different promo code

---

### 🧪 Scenario 7: Flat Discount Promo

**Objective**: Test flat amount discount (not percentage)

**Steps**:
1. Select a service with price ≥ ₹300
2. Follow booking flow
3. Enter: `FIRST100` (flat ₹100 off)
4. Click "Apply"

**Expected Results**:
- ✅ Success alert: "You saved ₹100"
- ✅ Booking summary shows:
  - Original Price: ₹500
  - Discount (FIRST100): -₹100
  - Total: ₹400

---

### 🧪 Scenario 8: Percentage with Max Discount Cap

**Objective**: Verify max_discount is enforced

**Test Case A**: Discount below cap
- Service price: ₹200
- Promo: TRIMIT50 (50% off, max ₹100)
- Expected discount: ₹100 (50% of ₹200)
- Expected total: ₹100

**Test Case B**: Discount above cap
- Service price: ₹500
- Promo: TRIMIT50 (50% off, max ₹100)
- Expected discount: ₹100 (capped, not ₹250)
- Expected total: ₹400

---

## Owner Testing

### 🧪 Scenario 9: Create New Promo Code

**Objective**: Owner can create promo codes

**Steps**:
1. Login as owner
2. Navigate to "Promos" tab
3. Click "+ Create" button
4. Fill in form:
   - Code: `SUMMER25`
   - Description: `25% off summer special`
   - Discount Type: Percentage
   - Discount %: `25`
   - Max Discount: `200`
   - Min Order Value: `100`
   - Max Uses: `50`
   - Expiry Date: `2026-08-31`
   - Active: ON
5. Click "Create Promo Code"

**Expected Results**:
- ✅ Success toast: "Promo code created!"
- ✅ Modal closes
- ✅ New promo appears in list
- ✅ Shows all details correctly
- ✅ Usage bar shows 0/50 (0% used)

**Database Verification**:
```sql
SELECT * FROM promotions WHERE code = 'SUMMER25';
-- Should exist with correct values
```

---

### 🧪 Scenario 10: Edit Existing Promo

**Objective**: Owner can update promo details

**Steps**:
1. In Promos tab, click on existing promo card
2. Modify fields:
   - Max Uses: `100` (was 50)
   - Expiry Date: `2026-12-31` (extend)
3. Click "Update Promo Code"

**Expected Results**:
- ✅ Success toast: "Promo code updated!"
- ✅ Modal closes
- ✅ Promo card reflects new values
- ✅ Code itself cannot be changed (field disabled)

---

### 🧪 Scenario 11: Deactivate Promo

**Objective**: Owner can deactivate promo codes

**Steps**:
1. In Promos tab, click "Deactivate" on a promo
2. Confirm in alert dialog

**Expected Results**:
- ✅ Success toast: "Promo code deactivated"
- ✅ Promo card shows "Inactive" badge
- ✅ Card appears dimmed (opacity 0.6)
- ✅ Customers cannot use this code anymore

**Customer Verification**:
- Try to apply deactivated code
- Should get error: "Invalid promo code"

---

### 🧪 Scenario 12: View Usage Stats

**Objective**: Owner can see promo performance

**Steps**:
1. Create promo with max_uses = 10
2. Have 3 customers use the promo
3. View promo in owner's Promos tab

**Expected Results**:
- ✅ Shows "Used: 3 / 10"
- ✅ Progress bar shows 30% filled
- ✅ Progress bar color:
  - Green (0-74%)
  - Orange (75-99%)
  - Red (100%)

---

### 🧪 Scenario 13: Duplicate Code Prevention

**Objective**: Prevent duplicate promo codes

**Steps**:
1. Try to create promo with code `TRIMIT50` (already exists)
2. Click "Create Promo Code"

**Expected Results**:
- ✅ Error toast: "Promo code already exists"
- ✅ Modal stays open
- ✅ Can correct the code and retry

---

## Edge Cases

### 🧪 Scenario 14: Network Error During Validation

**Objective**: Handle network failures gracefully

**Steps**:
1. Disconnect internet / stop backend
2. Try to apply promo code
3. Click "Apply"

**Expected Results**:
- ✅ Loading spinner appears
- ✅ After timeout, error message: "Failed to validate promo code"
- ✅ Can retry when connection restored

---

### 🧪 Scenario 15: Rapid Apply Clicks

**Objective**: Prevent duplicate API calls

**Steps**:
1. Enter valid promo code
2. Click "Apply" button multiple times rapidly

**Expected Results**:
- ✅ Button disables during loading
- ✅ Only one API call is made
- ✅ No duplicate validations

---

### 🧪 Scenario 16: Promo Code with Spaces

**Objective**: Handle whitespace in input

**Steps**:
1. Enter: `  TRIMIT50  ` (with leading/trailing spaces)
2. Click "Apply"

**Expected Results**:
- ✅ Spaces are trimmed automatically
- ✅ Code is validated as `TRIMIT50`
- ✅ Promo applies successfully

---

### 🧪 Scenario 17: Case Insensitive Codes

**Objective**: Codes work regardless of case

**Steps**:
1. Enter: `trimit50` (lowercase)
2. Click "Apply"

**Expected Results**:
- ✅ Automatically converted to uppercase
- ✅ Promo applies successfully

---

### 🧪 Scenario 18: Booking with Promo After Slot Becomes Unavailable

**Objective**: Handle race condition

**Steps**:
1. Apply valid promo code
2. Wait for slot hold to expire (90 seconds)
3. Try to confirm booking

**Expected Results**:
- ✅ Booking fails with slot conflict error
- ✅ Promo is NOT consumed
- ✅ User can select new slot and reapply promo

---

## Performance Testing

### 🧪 Scenario 19: Promo Validation Speed

**Objective**: Ensure fast validation

**Steps**:
1. Apply promo code
2. Measure time from click to response

**Expected Results**:
- ✅ Response time < 200ms
- ✅ No noticeable lag
- ✅ Smooth user experience

**Measurement**:
```javascript
// In browser console
console.time('promo-validation');
// Click Apply
// Wait for response
console.timeEnd('promo-validation');
// Should show < 200ms
```

---

### 🧪 Scenario 20: Load Test Owner Promo List

**Objective**: Handle many promo codes

**Setup**:
```sql
-- Create 50 promo codes
INSERT INTO promotions (id, code, discount_type, discount_value, salon_id, active)
SELECT 
  gen_random_uuid(),
  'PROMO' || generate_series,
  'percent',
  10,
  '<salon_id>',
  true
FROM generate_series(1, 50);
```

**Steps**:
1. Navigate to Promos tab

**Expected Results**:
- ✅ List loads in < 1 second
- ✅ Smooth scrolling
- ✅ All promos render correctly

---

## Regression Testing

### 🧪 Scenario 21: Booking Without Promo Still Works

**Objective**: Ensure promo is optional

**Steps**:
1. Complete entire booking flow
2. Skip promo code section (leave empty)
3. Confirm booking

**Expected Results**:
- ✅ Booking succeeds
- ✅ Full price is charged
- ✅ promo_code field in DB is NULL
- ✅ No promo_usage record created

---

### 🧪 Scenario 22: Existing Bookings Unaffected

**Objective**: Verify backward compatibility

**Steps**:
1. View existing bookings (created before promo feature)
2. Check booking details

**Expected Results**:
- ✅ Old bookings display correctly
- ✅ No errors from missing promo fields
- ✅ Price calculations still correct

---

## Automated Test Script

```bash
#!/bin/bash
# Quick automated test script

echo "🧪 Testing Promo Codes Feature"
echo "================================"

# Test 1: Valid promo
echo "Test 1: Valid promo code..."
curl -X POST http://localhost:8000/api/v1/promotions/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"TRIMIT50","salon_id":"test-salon","booking_amount":500}' \
  | jq '.valid'
# Expected: true

# Test 2: Invalid promo
echo "Test 2: Invalid promo code..."
curl -X POST http://localhost:8000/api/v1/promotions/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"INVALID","salon_id":"test-salon","booking_amount":500}' \
  | jq '.valid'
# Expected: false

# Test 3: Min order not met
echo "Test 3: Min order not met..."
curl -X POST http://localhost:8000/api/v1/promotions/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"TRIMIT50","salon_id":"test-salon","booking_amount":100}' \
  | jq '.error'
# Expected: "Minimum order value..."

echo "✅ Tests complete!"
```

---

## Test Data Setup

### Sample Promo Codes for Testing

```sql
-- Already in database (from 13_promo_codes.sql)
-- TRIMIT50: 50% off, max ₹100, min ₹200
-- FIRST100: ₹100 flat off, min ₹300
-- WELCOME20: 20% off, max ₹200, no min

-- Additional test promos
INSERT INTO promotions (id, code, description, discount_type, discount_value, max_discount, min_order_value, max_uses, expires_at, active, salon_id)
VALUES
  -- Expired promo
  (gen_random_uuid(), 'EXPIRED50', 'Expired promo', 'percent', 50, 100, 0, NULL, '2026-01-01', true, NULL),
  
  -- Max uses reached
  (gen_random_uuid(), 'MAXED10', 'Max uses test', 'percent', 10, 50, 0, 5, NULL, true, NULL),
  
  -- High min order
  (gen_random_uuid(), 'VIP500', 'VIP customers', 'percent', 30, 300, 1000, NULL, NULL, true, NULL),
  
  -- Inactive promo
  (gen_random_uuid(), 'INACTIVE', 'Inactive test', 'flat', 50, NULL, 0, NULL, NULL, false, NULL);

-- Set MAXED10 to max uses
UPDATE promotions SET used_count = 5 WHERE code = 'MAXED10';
```

---

## Checklist

### Customer Features
- [ ] Apply valid promo code
- [ ] Apply invalid promo code
- [ ] Apply expired promo code
- [ ] Apply promo with min order not met
- [ ] Apply promo with max uses reached
- [ ] Remove applied promo
- [ ] Complete booking with promo
- [ ] Complete booking without promo
- [ ] See discount in booking summary
- [ ] See discount in confirmation

### Owner Features
- [ ] View promo list
- [ ] Create percentage promo
- [ ] Create flat amount promo
- [ ] Edit existing promo
- [ ] Deactivate promo
- [ ] View usage stats
- [ ] See progress bars
- [ ] See expired badge
- [ ] See inactive badge
- [ ] Prevent duplicate codes

### Edge Cases
- [ ] Network error handling
- [ ] Rapid apply clicks
- [ ] Promo with spaces
- [ ] Case insensitive codes
- [ ] Slot conflict with promo
- [ ] Very long promo code
- [ ] Special characters in code

### Performance
- [ ] Validation < 200ms
- [ ] List loads quickly
- [ ] Smooth scrolling
- [ ] No memory leaks

### Regression
- [ ] Booking without promo works
- [ ] Existing bookings unaffected
- [ ] Other features still work

---

## Bug Reporting Template

```markdown
### Bug Report: [Brief Description]

**Environment**:
- Platform: iOS / Android / Web
- App Version: X.X.X
- Backend: Local / Production

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots**:
[Attach if applicable]

**Logs**:
```
[Paste relevant logs]
```

**Additional Context**:

```

---

## Success Criteria

✅ All 22 test scenarios pass
✅ No console errors
✅ No database errors
✅ Performance metrics met
✅ UI/UX is smooth and intuitive
✅ Error messages are clear
✅ Success feedback is satisfying

---

**Testing Date**: _____________
**Tester**: _____________
**Status**: ⬜ Pass ⬜ Fail
**Notes**: _____________
