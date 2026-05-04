# TrimiT Implementation Plan - Beat Zoylee

## 📊 Current Status Assessment

### ✅ Already Built (Competitive Advantages)
- Atomic booking with RPC (prevents double-booking)
- 90-second slot holds (prevents race conditions)
- Real-time slot updates via Supabase
- Multi-booking per slot system
- Service offers with discount percentages
- Geospatial search with Haversine formula
- HMAC-SHA256 request signing
- Offline-first architecture with 24h cache

### 🎯 Missing Features (Zoylee Has)
- Staff/stylist selection
- Promo codes & discount engine
- 1-click rescheduling
- Combo packages
- Waitlist system
- Loyalty points
- Group/family bookings

---

## 🏗️ PHASE 1: Quick Wins (Week 1-2)
**Goal**: Ship high-impact features with minimal backend complexity

### 1.1 Promo Codes System (Days 1-2)
**Business Impact**: 15-20% conversion lift
**Complexity**: Low

#### Database Changes
- Create `promotions` table
- Add `promo_code` and `discount_amount` to `bookings` table

#### Backend Changes
- Add promo validation endpoint
- Update booking creation to apply discounts
- Update Razorpay order amount calculation

#### Mobile Changes
- Add promo code input in BookingScreen
- Show discount in booking summary
- Validate promo code before payment

#### Owner Dashboard
- Promo code management screen
- View promo usage analytics

---

### 1.2 One-Click Rescheduling (Days 3-5)
**Business Impact**: 30% reduction in cancellations
**Complexity**: Medium

#### Backend Changes
- New `PATCH /api/bookings/{id}/reschedule` endpoint
- Reuse atomic booking RPC for new slot validation
- Send notification to salon owner

#### Mobile Changes
- Add "Reschedule" button to BookingCard
- Reuse BookingScreen flow (skip payment)
- Show "Rescheduled" badge on booking

---

## 🏰 PHASE 2: The Moat (Week 3-5)
**Goal**: Build features competitors can't easily replicate

### 2.1 Staff Selection System (Days 6-15)
**Business Impact**: 40% increase in repeat bookings
**Complexity**: High

#### Database Changes
- Create `staff` table (name, bio, image, working hours)
- Create `staff_services` junction table
- Add `staff_id` and `any_staff` to `bookings` table
- Add `staff_id` to `reviews` table

#### Backend Changes
- Complete rewrite of slot generation algorithm
- Factor in staff availability, working days, assigned services
- New endpoints: staff CRUD, staff availability

#### Mobile Changes
- Horizontal staff picker in BookingScreen
- Staff profile cards with photos and ratings
- "Any Available" option as default
- Staff-specific reviews

#### Owner Dashboard
- Staff management screen
- Assign services to staff
- Set individual working hours
- View staff performance analytics

---

### 2.2 Combo Packages (Days 16-20)
**Business Impact**: 25% higher average order value
**Complexity**: Medium

#### Database Changes
- Create `combo_packages` table
- Link multiple services with discounted price

#### Backend Changes
- Combo CRUD endpoints
- Booking flow handles combo as single item
- Calculate total duration for slot blocking

#### Mobile Changes
- Combo cards in SalonDetailScreen
- "Save ₹X" badges
- Combo booking flow

---

## 🔄 PHASE 3: Retention Engine (Week 6-7)

### 3.1 Waitlist System (Days 21-26)
**Business Impact**: Capture 20% of lost bookings
**Complexity**: Medium-High

#### Database Changes
- Create `waitlists` table
- Add trigger on booking cancellation

#### Backend Changes
- Waitlist CRUD endpoints
- Background job to notify waitlisted users
- Expo push notification integration

#### Mobile Changes
- "🔔 Notify Me" button on full slots
- Push notification → deep link to booking

---

### 3.2 Loyalty Points (Days 27-30)
**Business Impact**: 35% increase in repeat bookings
**Complexity**: Low

#### Database Changes
- Add `loyalty_points` to users table
- Create `points_transactions` table

#### Backend Changes
- Award points on booking completion
- Redeem points as discount

#### Mobile Changes
- Points balance in ProfileScreen
- "Use points" option in BookingScreen

---

## 🎨 PHASE 4: Polish (Week 8)

### 4.1 Group Bookings (Days 31-33)
- Add `guest_count` to bookings
- Update capacity checks
- UI counter in BookingScreen

### 4.2 Enhanced Analytics (Days 34-35)
- Staff performance metrics
- Promo code ROI tracking
- Waitlist conversion rates

---

## 📅 Execution Timeline

| Week | Phase | Features | Status |
|------|-------|----------|--------|
| 1 | Quick Wins | Promo Codes | 🚀 STARTING NOW |
| 1-2 | Quick Wins | Rescheduling | ⏳ Next |
| 3-4 | The Moat | Staff Selection | 📋 Planned |
| 4-5 | The Moat | Combo Packages | 📋 Planned |
| 6 | Retention | Waitlist | 📋 Planned |
| 6-7 | Retention | Loyalty Points | 📋 Planned |
| 8 | Polish | Group Bookings + Analytics | 📋 Planned |

---

## 🎯 Success Metrics

### Phase 1 Targets
- Promo code redemption rate: >15%
- Reschedule vs cancel ratio: 3:1
- Customer satisfaction: +20%

### Phase 2 Targets
- Staff selection usage: >60%
- Combo package adoption: >25%
- Average order value: +25%

### Phase 3 Targets
- Waitlist conversion: >20%
- Loyalty program enrollment: >40%
- Repeat booking rate: +35%

---

## 🚀 STARTING NOW: Promo Codes Implementation

### Step 1: Database Schema (15 min)
### Step 2: Backend API (2 hours)
### Step 3: Mobile UI (3 hours)
### Step 4: Owner Dashboard (2 hours)
### Step 5: Testing (1 hour)

**Total: 1-2 days**

Let's begin! 🎉
