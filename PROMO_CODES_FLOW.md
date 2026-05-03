# Promo Codes Feature - Flow Diagram

## Customer Booking Flow with Promo Code

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER BOOKING FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

1. SELECT SERVICE
   ┌──────────────┐
   │ Browse Salons│
   │ Pick Service │
   └──────┬───────┘
          │
          ▼
2. SELECT DATE & TIME
   ┌──────────────┐
   │ Choose Date  │
   │ Pick Slot    │
   └──────┬───────┘
          │
          ▼
3. SELECT PAYMENT METHOD
   ┌──────────────┐
   │ Cash / Card  │
   └──────┬───────┘
          │
          ▼
4. APPLY PROMO CODE (NEW!)
   ┌─────────────────────────────────────────┐
   │  ┌─────────────────┐  ┌──────────┐     │
   │  │ Enter Code      │  │  APPLY   │     │
   │  │ [TRIMIT50____]  │  │  BUTTON  │     │
   │  └─────────────────┘  └──────────┘     │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │     POST /api/v1/promotions/validate    │
   │     {                                    │
   │       code: "TRIMIT50",                  │
   │       salon_id: "...",                   │
   │       booking_amount: 500                │
   │     }                                    │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │    Database: validate_promo_code()      │
   │    ✓ Code exists & active               │
   │    ✓ Not expired                        │
   │    ✓ Salon match (or global)            │
   │    ✓ Min order met (₹200 ≤ ₹500)       │
   │    ✓ Max uses not exceeded              │
   │    ✓ Calculate discount (50% = ₹250)    │
   │    ✓ Apply max discount cap (₹100)      │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │         VALIDATION RESULT               │
   │  ┌───────────────────────────────────┐  │
   │  │ ✓ Promo Applied!                  │  │
   │  │ You saved ₹100                    │  │
   │  │                                   │  │
   │  │ [TRIMIT50] [×]                    │  │
   │  └───────────────────────────────────┘  │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
5. REVIEW BOOKING SUMMARY
   ┌─────────────────────────────────────────┐
   │  Booking Summary                        │
   │  ────────────────────────────────────   │
   │  Date:     May 5, 2026                  │
   │  Time:     10:00 AM                     │
   │  Duration: 30 mins                      │
   │  ────────────────────────────────────   │
   │  Original Price:  ₹500  (strikethrough) │
   │  Discount (TRIMIT50): -₹100 (green)    │
   │  ────────────────────────────────────   │
   │  Total:           ₹400  (bold)          │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
6. CONFIRM BOOKING
   ┌─────────────────────────────────────────┐
   │     POST /api/bookings                  │
   │     {                                    │
   │       salon_id: "...",                   │
   │       service_id: "...",                 │
   │       booking_date: "2026-05-05",        │
   │       time_slot: "10:00",                │
   │       payment_method: "salon_cash",      │
   │       promo_code: "TRIMIT50"  ← NEW!    │
   │     }                                    │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │    Database: create_atomic_booking()    │
   │    1. Validate promo again (security)   │
   │    2. Calculate final amount            │
   │    3. Create booking record             │
   │    4. Store promo_code, discount_amount │
   │    5. Create promo_usage record         │
   │    6. Increment promotions.used_count   │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
7. BOOKING CONFIRMED
   ┌─────────────────────────────────────────┐
   │         ✓ Booking Confirmed!            │
   │                                         │
   │  You saved ₹100 with TRIMIT50           │
   │  Final amount: ₹400                     │
   └─────────────────────────────────────────┘
```

---

## Owner Promo Management Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OWNER PROMO MANAGEMENT FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO PROMOS TAB
   ┌──────────────────────────────────────┐
   │  Owner Dashboard                     │
   │  [Dashboard] [Bookings] [Services]   │
   │  [PROMOS] ← NEW TAB [Settings]       │
   └──────────────┬───────────────────────┘
                  │
                  ▼
2. VIEW PROMO LIST
   ┌─────────────────────────────────────────────────────────────┐
   │  Promo Codes                              [+ Create]        │
   │  ─────────────────────────────────────────────────────────  │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │ [🎫 TRIMIT50]  [Inactive]                            │  │
   │  │ 50% off for new customers                            │  │
   │  │ 💰 50% off (max ₹100) | 🛒 Min: ₹200                │  │
   │  │ 👥 Used: 45 / 100                                    │  │
   │  │ 📅 Expires: Jun 2, 2026                              │  │
   │  │ ████████████░░░░░░░░ 45% used                        │  │
   │  │ [Edit] [Deactivate]                                  │  │
   │  └───────────────────────────────────────────────────────┘  │
   │                                                             │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │ [🎫 FIRST100]                                         │  │
   │  │ ₹100 off for premium services                        │  │
   │  │ 💰 ₹100 off | 🛒 Min: ₹300                           │  │
   │  │ 👥 Used: 12 / 50                                     │  │
   │  │ 📅 Expires: Jul 2, 2026                              │  │
   │  │ ████░░░░░░░░░░░░░░░░ 24% used                        │  │
   │  │ [Edit] [Deactivate]                                  │  │
   │  └───────────────────────────────────────────────────────┘  │
   └─────────────────────────────────────────────────────────────┘
                  │
                  ▼
3. CREATE NEW PROMO
   ┌─────────────────────────────────────────────────────────────┐
   │  Create Promo Code                                    [×]   │
   │  ─────────────────────────────────────────────────────────  │
   │  Promo Code *                                               │
   │  [🎫 SAVE20_____________]                                   │
   │                                                             │
   │  Description                                                │
   │  [20% off for all services_____________________________]   │
   │                                                             │
   │  Discount Type *                                            │
   │  [Percentage] [Flat Amount]  ← Toggle                      │
   │                                                             │
   │  Discount % *        Max Discount                           │
   │  [💰 20____]         [💰 150____]                          │
   │                                                             │
   │  Min Order Value     Max Uses                               │
   │  [🛒 0______]        [👥 200____]                          │
   │                                                             │
   │  Expiry Date (YYYY-MM-DD)                                   │
   │  [📅 2026-12-31_____]                                      │
   │                                                             │
   │  Active  [●──────] ← Toggle                                │
   │  Customers can use this promo code                          │
   │                                                             │
   │  [Create Promo Code]                                        │
   └─────────────────────────────────────────────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────────┐
   │     POST /api/v1/promotions             │
   │     {                                    │
   │       code: "SAVE20",                    │
   │       description: "20% off...",         │
   │       discount_type: "percent",          │
   │       discount_value: 20,                │
   │       max_discount: 150,                 │
   │       min_order_value: 0,                │
   │       max_uses: 200,                     │
   │       expires_at: "2026-12-31",          │
   │       active: true                       │
   │     }                                    │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │    Database: INSERT INTO promotions     │
   │    ✓ Verify salon ownership             │
   │    ✓ Check code uniqueness              │
   │    ✓ Create promo record                │
   └─────────────┬───────────────────────────┘
                 │
                 ▼
4. PROMO CREATED
   ┌─────────────────────────────────────────┐
   │  ✓ Promo code created!                  │
   │                                         │
   │  SAVE20 is now active and ready to use │
   └─────────────────────────────────────────┘
```

---

## Promo Validation Logic (Database RPC)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROMO VALIDATION ALGORITHM                        │
└─────────────────────────────────────────────────────────────────────┘

INPUT:
  - p_code: "TRIMIT50"
  - p_salon_id: "abc-123"
  - p_user_id: "user-456"
  - p_booking_amount: 500

STEP 1: Find Promo Code
  ┌─────────────────────────────────────────┐
  │ SELECT * FROM promotions                │
  │ WHERE code = 'TRIMIT50'                 │
  │   AND active = true                     │
  └─────────────┬───────────────────────────┘
                │
                ├─ NOT FOUND → Return {valid: false, error: "Invalid code"}
                │
                ▼
  ┌─────────────────────────────────────────┐
  │ Promo Found:                            │
  │ - discount_type: "percent"              │
  │ - discount_value: 50                    │
  │ - max_discount: 100                     │
  │ - min_order_value: 200                  │
  │ - max_uses: 100                         │
  │ - used_count: 45                        │
  │ - expires_at: "2026-06-02"              │
  │ - salon_id: NULL (global)               │
  └─────────────┬───────────────────────────┘
                │
                ▼

STEP 2: Check Expiry
  ┌─────────────────────────────────────────┐
  │ IF expires_at IS NOT NULL               │
  │   AND expires_at < NOW()                │
  │ THEN                                    │
  │   Return {valid: false,                 │
  │           error: "Promo code expired"}  │
  └─────────────┬───────────────────────────┘
                │
                ├─ EXPIRED → Return error
                │
                ▼ NOT EXPIRED

STEP 3: Check Salon Match
  ┌─────────────────────────────────────────┐
  │ IF salon_id IS NOT NULL                 │
  │   AND salon_id != p_salon_id            │
  │ THEN                                    │
  │   Return {valid: false,                 │
  │           error: "Not valid for salon"} │
  └─────────────┬───────────────────────────┘
                │
                ├─ NO MATCH → Return error
                │
                ▼ MATCH (or global)

STEP 4: Check Min Order Value
  ┌─────────────────────────────────────────┐
  │ IF p_booking_amount < min_order_value   │
  │ THEN                                    │
  │   Return {valid: false,                 │
  │           error: "Min order ₹200"}      │
  └─────────────┬───────────────────────────┘
                │
                ├─ TOO LOW → Return error
                │
                ▼ MEETS MIN (500 ≥ 200)

STEP 5: Check Max Uses
  ┌─────────────────────────────────────────┐
  │ IF max_uses IS NOT NULL                 │
  │   AND used_count >= max_uses            │
  │ THEN                                    │
  │   Return {valid: false,                 │
  │           error: "Max uses reached"}    │
  └─────────────┬───────────────────────────┘
                │
                ├─ MAXED OUT → Return error
                │
                ▼ STILL AVAILABLE (45 < 100)

STEP 6: Calculate Discount
  ┌─────────────────────────────────────────┐
  │ IF discount_type = 'percent' THEN       │
  │   raw_discount = booking_amount *       │
  │                  (discount_value / 100) │
  │   discount = MIN(raw_discount,          │
  │                  max_discount)          │
  │ ELSE (flat)                             │
  │   discount = discount_value             │
  │ END IF                                  │
  └─────────────┬───────────────────────────┘
                │
                ▼
  ┌─────────────────────────────────────────┐
  │ Calculation:                            │
  │ - booking_amount: 500                   │
  │ - discount_value: 50%                   │
  │ - raw_discount: 500 * 0.5 = 250         │
  │ - max_discount: 100                     │
  │ - final_discount: MIN(250, 100) = 100   │
  │ - final_amount: 500 - 100 = 400         │
  └─────────────┬───────────────────────────┘
                │
                ▼

STEP 7: Return Success
  ┌─────────────────────────────────────────┐
  │ Return {                                │
  │   valid: true,                          │
  │   promo_id: "promo-789",                │
  │   discount_amount: 100,                 │
  │   final_amount: 400,                    │
  │   description: "50% off..."             │
  │ }                                       │
  └─────────────────────────────────────────┘
```

---

## Database Trigger: Auto-Increment Usage Count

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROMO USAGE TRACKING TRIGGER                      │
└─────────────────────────────────────────────────────────────────────┘

TRIGGER: increment_promo_usage
FIRES: AFTER INSERT ON promo_usage

WHEN: New promo usage record is created

ACTION:
  ┌─────────────────────────────────────────┐
  │ UPDATE promotions                       │
  │ SET used_count = used_count + 1         │
  │ WHERE id = NEW.promo_id                 │
  └─────────────────────────────────────────┘

EXAMPLE:
  Before: promotions.used_count = 45
  
  INSERT INTO promo_usage (promo_id, user_id, booking_id, discount_applied)
  VALUES ('promo-789', 'user-456', 'booking-999', 100);
  
  After: promotions.used_count = 46
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ERROR SCENARIOS                              │
└─────────────────────────────────────────────────────────────────────┘

1. INVALID CODE
   Input: "INVALID123"
   ↓
   Database: No matching record
   ↓
   Response: {valid: false, error: "Invalid promo code"}
   ↓
   UI: Red error message below input field

2. EXPIRED CODE
   Input: "EXPIRED50"
   ↓
   Database: expires_at = "2026-01-01" < NOW()
   ↓
   Response: {valid: false, error: "This promo code has expired"}
   ↓
   UI: Red error message with calendar icon

3. MIN ORDER NOT MET
   Input: "TRIMIT50" (min ₹200)
   Booking: ₹150
   ↓
   Database: 150 < 200
   ↓
   Response: {valid: false, error: "Minimum order value of ₹200 required"}
   ↓
   UI: Red error message with cart icon

4. MAX USES REACHED
   Input: "POPULAR20"
   ↓
   Database: used_count (100) >= max_uses (100)
   ↓
   Response: {valid: false, error: "This promo code has reached its usage limit"}
   ↓
   UI: Red error message with people icon

5. NETWORK ERROR
   Input: "TRIMIT50"
   ↓
   API: Network timeout / 500 error
   ↓
   Response: Axios error
   ↓
   UI: "Failed to validate promo code. Please try again."
   ↓
   Toast: Error notification

6. DUPLICATE CODE (Owner Creation)
   Input: Create "TRIMIT50" (already exists)
   ↓
   Database: UNIQUE constraint violation
   ↓
   Response: 400 Bad Request
   ↓
   UI: "Promo code already exists"
   ↓
   Toast: Error notification
```

---

## Success Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUCCESSFUL PROMO APPLICATION                      │
└─────────────────────────────────────────────────────────────────────┘

CUSTOMER SEES:
  ┌─────────────────────────────────────────┐
  │  Promo Code                             │
  │  ┌─────────────────┐  ┌──────────┐     │
  │  │ TRIMIT50        │  │  APPLY   │     │
  │  └─────────────────┘  └──────────┘     │
  └─────────────────────────────────────────┘
                ↓ Click Apply
  ┌─────────────────────────────────────────┐
  │  Promo Code                             │
  │  ┌─────────────────┐  ┌──────────┐     │
  │  │ TRIMIT50        │  │ [spinner]│     │
  │  └─────────────────┘  └──────────┘     │
  └─────────────────────────────────────────┘
                ↓ Validation (200ms)
  ┌─────────────────────────────────────────┐
  │  ✓ Promo Applied!                       │
  │  You saved ₹100                         │
  │                                         │
  │  ┌───────────────────────────────────┐  │
  │  │ ✓ TRIMIT50                    [×] │  │
  │  │ You saved ₹100!                   │  │
  │  └───────────────────────────────────┘  │
  └─────────────────────────────────────────┘
                ↓ Scroll down
  ┌─────────────────────────────────────────┐
  │  Booking Summary                        │
  │  ────────────────────────────────────   │
  │  Date:     May 5, 2026                  │
  │  Time:     10:00 AM                     │
  │  Duration: 30 mins                      │
  │  ────────────────────────────────────   │
  │  Original Price:  ₹500                  │
  │  Discount (TRIMIT50): -₹100 (green)    │
  │  ────────────────────────────────────   │
  │  Total:           ₹400 (bold, large)    │
  └─────────────────────────────────────────┘
                ↓ Confirm Booking
  ┌─────────────────────────────────────────┐
  │         ✓ Booking Confirmed!            │
  │                                         │
  │  Service: Haircut                       │
  │  Date: May 5, 2026 • 10:00 AM          │
  │  You saved ₹100 with TRIMIT50           │
  │  Total: ₹400                            │
  │                                         │
  │  [Get Directions] [View Bookings]       │
  └─────────────────────────────────────────┘

OWNER SEES (in Promos tab):
  ┌─────────────────────────────────────────┐
  │ [🎫 TRIMIT50]                           │
  │ 50% off for new customers               │
  │ 💰 50% off (max ₹100) | 🛒 Min: ₹200   │
  │ 👥 Used: 46 / 100  ← Incremented!      │
  │ 📅 Expires: Jun 2, 2026                 │
  │ ████████████░░░░░░░░ 46% used           │
  └─────────────────────────────────────────┘
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SYSTEM ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Mobile App      │
│  (React Native)  │
└────────┬─────────┘
         │
         │ POST /api/v1/promotions/validate
         │ POST /api/bookings (with promo_code)
         │
         ▼
┌──────────────────┐
│  FastAPI Backend │
│  (Python)        │
└────────┬─────────┘
         │
         │ 1. Validate request
         │ 2. Call RPC function
         │ 3. Return response
         │
         ▼
┌──────────────────┐
│  Supabase        │
│  (PostgreSQL)    │
│                  │
│  ┌────────────┐  │
│  │ promotions │  │
│  ├────────────┤  │
│  │ id         │  │
│  │ code       │  │
│  │ discount_* │  │
│  │ used_count │  │
│  └────────────┘  │
│                  │
│  ┌────────────┐  │
│  │promo_usage │  │
│  ├────────────┤  │
│  │ promo_id   │  │
│  │ user_id    │  │
│  │ booking_id │  │
│  │ discount   │  │
│  └────────────┘  │
│                  │
│  ┌────────────┐  │
│  │ bookings   │  │
│  ├────────────┤  │
│  │ promo_code │  │
│  │ discount_* │  │
│  └────────────┘  │
└──────────────────┘
```

---

**Created**: May 3, 2026
**Status**: Complete
**Next**: Testing & Deployment
