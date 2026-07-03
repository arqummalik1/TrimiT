# TrimiT — Salon Open / Close Kill-Switch — Master Plan

> Owner-controlled "Accepting bookings: ON / OFF" with timed auto-reopen.
> Blinkit-style, adapted for salons. Plan only — no code until approved.

---

## 1. The idea in one line
Give every owner a one-tap switch on their dashboard to stop/start taking NEW
bookings — without cancelling existing ones — with smart auto-reopen and reminders.

## 2. Two separate axes (critical — do not merge)
| Axis | Field | Meaning | Set by |
|------|-------|---------|--------|
| Subscription | `salons.subscription_active` | "Has the owner paid?" | System (billing) |
| **Open/Close** | `salons.accepting_bookings` | "Is the owner choosing to take bookings now?" | **Owner (manual)** |

A salon is bookable only when **subscription_active = true AND accepting_bookings = true AND not within a closed window.** Keep them independent — never overload one flag.

## 3. Database (new migration `53_salon_open_close.sql`, forward-only)
Add to `salons`:
- `accepting_bookings BOOLEAN NOT NULL DEFAULT TRUE`
- `closed_until TIMESTAMPTZ NULL` — auto-reopen time; NULL = closed indefinitely (manual)
- `closed_at TIMESTAMPTZ NULL` — when it was closed (for the 24h reminder)
- `closed_reason TEXT NULL` — optional ("On holiday", "Fully booked")

> All existing salons default to `accepting_bookings = TRUE` so nothing changes for current salons.

## 4. The "open" computation (lazy — no cron dependency)
A salon is **open** when:
```
subscription_active = TRUE
AND accepting_bookings = TRUE
AND (closed_until IS NULL OR now() >= closed_until)
```
The `closed_until` check is evaluated **on read** so even if the reopen cron is
late, the salon auto-opens the instant the time passes. The cron is only a
backup that flips the stored flag + fires the "you're open" push.

## 5. Backend
- **Gate:** in `create_booking` AND `reserve_slot`, after the existing
  `SALON_UNAVAILABLE` check, add a closed check → `403 SALON_CLOSED` with a
  friendly message + the reopen time.
- **New endpoint:** `PATCH /salons/{salon_id}/availability` (owner-only, idempotent)
  body: `{ accepting_bookings: bool, closed_until?: ISO8601, reason?: string }`.
  Validates owner ownership; writes the fields; returns the updated salon.
- **Discovery RPC:** include the new fields so the customer list/detail can show
  the closed badge (like it already returns `subscription_active`).
- **Reminder runner:** new internal cron endpoint `POST /salons/internal/run-availability`
  (admin token) that: (a) flips salons whose `closed_until` has passed back to
  open + pushes the owner; (b) pushes a reminder to owners closed >24h with no
  `closed_until`. Deduped.

## 6. Predefined close options (the UX)
When the owner taps OFF, a bottom sheet offers:
| Option | Sets `closed_until` |
|--------|---------------------|
| Close for 2 hours | now + 2h |
| Close for today (reopen tomorrow 9am) | tomorrow 09:00 local |
| Close until a date… | date/time picker (validated; never a free-text mess) |
| Close indefinitely | NULL (manual reopen, triggers 24h reminder) |

Reopen is always one tap ("Open now"), which clears `closed_until` + sets `accepting_bookings = true`.

## 7. Mobile (owner)
- **Dashboard header** (merged into the main screen header, as you asked): a clear
  status pill + toggle — green "Open · Accepting bookings" / red "Closed · reopens 9am".
- Tapping it opens the predefined-options sheet (section 6).
- Date/time picker uses a native calendar (no free text) for "until a date".
- State syncs in **realtime** via the existing salon realtime channel so it's
  instant across the owner's devices.

## 8. Mobile + Web (customer)
- `SalonCard`, `SalonDetailScreen`, `BookingScreen` show a **"Temporarily closed —
  reopens <when>"** badge when closed. Salon stays **visible** (not hidden, not
  greyscale-removed) — only the Book action is disabled.
- Booking attempt on a closed salon → handled `403 SALON_CLOSED` with the friendly
  message (mirrors existing `SALON_UNAVAILABLE` handling).

## 9. Notifications
See `docs/NOTIFICATIONS.md` §3. Summary:
- Closing → no customer push. Owner sees instant in-app confirm.
- Owner reminder if closed >24h with no reopen time.
- Owner push when auto-reopen fires.
- New Android channel work (`reminders` already exists; add `offers_festive`,
  `weekend`) is tracked in the notifications doc and can ship separately.

## 10. Build order (when approved)
1. Migration `53` (DB fields) — apply manually in Supabase.
2. Backend gate + `PATCH /availability` endpoint + tests.
3. Owner dashboard toggle + close-options sheet (mobile).
4. Customer closed-badge + booking block (mobile + web).
5. Reminder/auto-reopen cron endpoint + push wiring.
6. New notification channels (festive/weekend) — optional, separate PR.

## 11. Risks & decisions
- ✅ Existing bookings never cancelled by closing (new bookings only).
- ✅ Auto-reopen is lazy (no "stuck closed" if cron is late).
- ✅ Separate from subscription state.
- ⚠️ Needs a NEW mobile build (Play Store) for owners to get the toggle. Backend +
  web deploy from `main`.
- ❓ **Decision needed:** do salons already have proper per-day business hours? If
  yes, this toggle is a manual override on top. If no, this is the interim
  availability control (recommended either way).

---

## Open questions for the founder
1. Business hours: do we have them per salon, or is availability just "slots exist"?
2. Festive/weekend channels: ship with this feature, or as a separate notifications PR?
3. Default predefined options OK (2h / today / until-date / indefinite), or different presets?
