# TrimiT — Notification System & Strategy

> How TrimiT push notifications work today, the channel strategy going forward,
> and exactly how notifications behave when a salon turns itself OFF.
> Researched against Zomato / Blinkit / Swiggy patterns. Plain English.

---

## 1. What we have today (the real system)

| Piece | File | Job |
|------|------|-----|
| Core sender | `services/push_notifications.py` | Sends via Expo Push API, retries, clears dead tokens |
| Per-event booking pushes | `services/push_dispatch.py` + `booking_push.py` | New booking, confirmed, cancelled, reschedule, payment events |
| Subscription pushes | `services/subscription_notifications.py` | Trial reminders + billing lifecycle |
| Marketing fan-out | `services/broadcast.py` | Admin sends one push to many (customers/owners/all) |
| Preferences + dedupe | `services/push_preferences.py` | Per-user opt-in checks + no-double-send |

**Android channels today (only 2):**
- `bookings_v2` — transactional (bookings, payments). High importance.
- `promotions` — marketing. User can mute without losing booking alerts.

**User opt-in categories (in `users` table):**
`push_enabled` (master) · `notify_bookings` · `notify_booking_updates` · `notify_promotional` · `notify_reminders`

**Cron pattern:** an external scheduler hits an admin-token endpoint
(e.g. `POST /subscriptions/internal/run-reminders`). Any new scheduled push
(salon-still-closed reminder, auto-reopen) follows this same pattern.

---

## 2. Channel strategy (the upgrade)

We move from 2 channels to a clean set. Each Android channel = one row the user
can mute independently in system settings (this is how Zomato/Swiggy do it).

| Channel id | Name shown to user | Type | Mutable? | Examples |
|-----------|--------------------|------|----------|----------|
| `bookings_v2` | Bookings & Payments | Transactional | No (critical) | New booking, confirmed, cancelled, reschedule, payment verified |
| `reminders` | Reminders | Reminder | Yes | "Appointment in 1 hour", "Your salon is still closed" |
| `promotions` | Offers & Promotions | Marketing | Yes | Generic discounts, new feature |
| `offers_festive` | Festive Offers | Marketing | Yes | Diwali, Eid, New Year, Holi campaigns |
| `weekend` | Weekend Specials | Marketing | Yes | Fri–Sun nudges, weekend slots filling up |

> **Rule:** transactional NEVER goes on a marketing channel. A user who mutes
> offers must still get "your booking is confirmed". This is both UX-correct and
> required to avoid Play Store policy issues.

### Why separate festive + weekend channels (the research)
- **Zomato/Swiggy:** segment marketing so a user can silence "food offers" but
  keep order updates. They run *time-boxed* festive campaigns (Diwali, IPL) on
  their own track with richer creatives.
- **Blinkit/Zepto:** heavy weekend + late-night nudges ("weekend stock-up",
  "party essentials"). Separating these means power-users who hate weekday spam
  can still opt into weekend deals — higher opt-in, fewer uninstalls.
- **Lesson for us:** one big "promotions" bucket = users mute everything. Splitting
  festive/weekend lets customers keep the offers they actually want, which keeps
  delivery rates (and trust) high.

---

## 3. When a salon turns itself OFF — notification behaviour

This is the core of the new feature. Three rules:

### Rule 1 — Closing does NOT spam customers
When an owner closes the salon, we send **no push to customers**. Existing
confirmed bookings are untouched. Blasting "Salon X is closed" to everyone would
be noise and would hurt the salon's image. The closed state is shown *passively*
(badge on the salon card, booking blocked) — not pushed.

### Rule 2 — Remind the OWNER if they forget to reopen
The #1 risk: owner closes "for 2 hours", forgets, loses 3 days of bookings, blames us.
Safety nets:

| Trigger | Push (channel `reminders`) |
|--------|----------------------------|
| Salon closed **with no reopen time**, still closed after **24h** | "Your salon is still closed. Reopen to start getting bookings again." |
| **1 hour before** a scheduled auto-reopen | (optional) "Your salon reopens in 1 hour. Ready for bookings?" |
| Auto-reopen time reached | "Your salon is open again 🎉 You're now accepting bookings." |

Each is deduped (one row per `(salon, reminder_key, day)`) so cron retries never double-send.

### Rule 3 — Confirm the action to the owner instantly
On toggle, the owner sees an immediate in-app confirmation (toast/sheet), not a push.
Pushes are only for the *delayed* reminders above.

### What about a customer who tries to book a just-closed salon?
No push. They see "Temporarily closed — reopens <when>" on the booking screen and
the Book button is disabled (mirrors the existing `SALON_UNAVAILABLE` UX, new code
`SALON_CLOSED`).

---

## 4. When TrimiT should push (the full map)

Researched against Zomato/Blinkit/Swiggy. ✅ = we do it / planned.

| Moment | Audience | Channel | Status |
|--------|----------|---------|--------|
| New booking received | Owner | bookings_v2 | ✅ |
| Booking confirmed / cancelled / rescheduled | Customer | bookings_v2 | ✅ |
| Payment verified / rejected (UPI) | Customer | bookings_v2 | ✅ |
| Appointment reminder (1h before) | Customer | reminders | ✅ |
| Trial ending / payment failed | Owner | reminders | ✅ |
| Salon still closed (24h) / auto-reopened | Owner | reminders | 🔜 (this feature) |
| Festive campaign (Diwali/Eid) | Customers | offers_festive | 🔜 |
| Weekend specials (Fri–Sun) | Customers | weekend | 🔜 |
| Generic offer / new feature | Customers/owners | promotions | ✅ (broadcast) |
| Win-back ("we miss you", no booking 30d) | Customer | promotions | 🔜 future |
| Abandoned booking (picked slot, didn't confirm) | Customer | reminders | 🔜 future |

---

## 5. Guardrails (do not break)
- Transactional pushes ignore marketing opt-out. Marketing respects `notify_promotional`.
- Every push checks `should_send_push(user, category)` first.
- Every scheduled push is deduped via `notification_events` (or a `subscription_events`-style key).
- Quiet hours for marketing: no festive/weekend/promo pushes 10pm–8am IST (planned).
- Frequency cap: max 1 marketing push/day/user (planned).
