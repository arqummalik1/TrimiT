# TrimiT Product Roadmap: The Strategy to Beat Zoylee

## Executive Summary
Zoylee’s primary market advantage is offering customers granular control over their salon experience (specifically *who* cuts their hair and *when*) combined with aggressive retention tactics (combos, family bookings, and loyalty). 

While TrimiT currently has a superior, highly scalable geospatial backend (Haversine via PostGIS) and robust concurrency controls (atomic RPC booking), the user experience is strictly transactional. To beat Zoylee, TrimiT must evolve from a "time-slot booking app" to a **"personalized salon experience platform."**

Below is the complete breakdown of missing features, their business value, and the technical blueprint for implementation.

---

## 1. Specific Stylist / Staff Selection (CRITICAL)
**The Zoylee Advantage:** Users don't just book "a haircut at Salon X at 4:00 PM." They book "a haircut with *Rahul* at Salon X at 4:00 PM." If they don't care, they can pick "Any Available Stylist."
**TrimiT's Current State:** Bookings are linked strictly to a salon, a service, and a time slot.

### Feature Requirements
*   **Customer UI:** When a user selects a service, a horizontal scroll of available staff members appears (with photos and ratings), plus an "Any Available" option.
*   **Owner UI:** Salon owners can add staff members, set their individual working hours (e.g., Rahul is off on Tuesdays), and assign specific services to specific staff (e.g., Priya does coloring, Rahul does fades).
*   **Technical Impact:**
    *   **Database:** Create `staff` table `(id, salon_id, name, bio, image_url)`.
    *   **Database:** Create `staff_services` mapping table (which staff can do which services).
    *   **Database:** Update `bookings` table to include an optional `staff_id`.
    *   **Backend:** The slot generation engine in `server.py` must be rewritten. Instead of just checking `count(bookings) < max_bookings_per_slot`, it must check if the requested (or *any*) qualified staff member is free during that 30-minute block.

---

## 2. Waitlist & "Notify Me" Engine
**The Zoylee Advantage:** Popular salons get fully booked fast. Zoylee captures lost revenue by letting users join a waitlist. If someone cancels, the waitlisted users are instantly pinged.
**TrimiT's Current State:** If a slot hits `max_bookings_per_slot`, it returns a 409 Conflict and blocks the user.

### Feature Requirements
*   **Customer UI:** Fully booked slots appear grayed out but feature a "🔔 Notify Me" bell icon.
*   **Automated Engine:** When a user cancels an appointment, the system automatically sends a push notification to all users waitlisted for that specific day/slot.
*   **Technical Impact:**
    *   **Database:** Create a `waitlists` table `(id, user_id, salon_id, booking_date, time_slot, created_at)`.
    *   **Backend:** Add a database trigger or FastAPI background task on booking cancellation to fetch waitlisted users and dispatch Expo Push Notifications via `backend/services/notifications.py`.

---

## 3. 1-Click Appointment Rescheduling
**The Zoylee Advantage:** Users can change their appointment time without the friction of canceling, waiting for a refund (or losing their deposit), and re-booking.
**TrimiT's Current State:** Users can only Book or Cancel.

### Feature Requirements
*   **Customer UI:** A "Reschedule" button on the `BookingCard` component that opens the calendar/slot picker, but bypasses the payment screen.
*   **Owner UI:** Owners can also propose a reschedule if they are running behind, which sends a notification to the customer to accept.
*   **Technical Impact:**
    *   **Backend:** A new `PATCH /api/bookings/{id}/reschedule` endpoint.
    *   **Logic:** Must invoke the same atomic Final Guard used in booking creation to ensure the *new* slot is available, then update the `time_slot` and `booking_date` within a single Postgres transaction. 

---

## 4. Promo Codes, Combos, and Loyalty Points
**The Zoylee Advantage:** High user retention driven by "Festive Combos" (e.g., Haircut + Beard + Spa for ₹999) and easily applicable discount codes.
**TrimiT's Current State:** Users pay the exact sum of the services selected via Razorpay or Cash. No discount engine exists.

### Feature Requirements
*   **Promo Engine:** Ability for TrimiT admins (global) or Salon Owners (local) to create codes (e.g., `TRIMIT50` for 50% off up to ₹100).
*   **Combo Packages:** Ability for owners to group 2-3 services together at a lower fixed price.
*   **Technical Impact:**
    *   **Database:** Create `promotions` table `(id, code, discount_type [flat/percent], max_discount, expires_at, salon_id [optional])`.
    *   **Backend:** Update `POST /api/bookings` and the Razorpay order creation to calculate totals dynamically based on a validated `promo_code`.

---

## 5. Group & Family Bookings
**The Zoylee Advantage:** A mother can book appointments for herself and two kids under a single transaction and single time block.
**TrimiT's Current State:** 1 User = 1 Booking = 1 Slot constraint.

### Feature Requirements
*   **Customer UI:** During checkout, a counter allows the user to specify "For 2 people."
*   **Technical Impact:**
    *   **Backend Check:** The Final Guard must ensure that `max_bookings_per_slot - current_bookings >= group_size`.
    *   **Database:** `bookings` table needs a `guest_count` integer (default 1), or a booking must generate multiple rows tied to a single `payment_order_id`.

---

## Proposed Execution Plan (How to build this)

### Phase 1: The Personalization Update (Weeks 1-3)
*Build the moat around human connection.*
1. Implement the `staff` and `staff_services` tables.
2. Update the Discover and Booking UI to allow specific staff selection.
3. Overhaul the slot generation algorithm in `server.py` to calculate availability by staff member, not just raw salon capacity.

### Phase 2: The Retention Update (Weeks 4-6)
*Stop users from churning to competitors.*
1. Build the Promos & Discount code engine.
2. Build Combo Services.
3. Implement 1-Click Rescheduling (backend atomic transaction + mobile UI).

### Phase 3: The "Zero Wait" Guarantee (Weeks 7-8)
*Fully match Zoylee's core value proposition.*
1. Build the Waitlist SQL tables.
2. Hook up Supabase Triggers or FastAPI background tasks to Expo Push Notifications for the "Notify Me" feature.
3. Implement Group Bookings to handle multiple guests in a single transaction.

### Phase 4: Experience & Feedback (Week 9)
*Capture the nuance of the salon experience.*
1. Enhance the review system to support staff-level ratings.
2. Implement a digital tipping flow (via Razorpay) either post-booking or at checkout.