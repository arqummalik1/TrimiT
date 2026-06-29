# TrimiT — Payments & Subscriptions Context (updated 2026-06-28)

> Hand this file to ChatGPT (or any AI/dev) to explain how TrimiT's money flows
> work today. Plain English. No prior context needed.

## 1. What TrimiT is
TrimiT is a salon booking marketplace for India. Two kinds of users:
- **Customers** — book salon services.
- **Salon owners** — list their salon, manage bookings.

Live in production: mobile app (Expo / Play Store), web (Vercel, trimit.online),
backend (FastAPI on Render), database/auth (Supabase Postgres).

## 2. The TWO separate money flows (do not mix them)

### A. Customer → Salon (booking payment) = UPI or Cash. TrimiT holds NO money.
- TrimiT is **not** a payment gateway for bookings. Money never enters TrimiT.
- Two methods only: **Cash at Salon** and **Pay with UPI**.
- UPI: the customer pays the salon's own **UPI ID** directly from any UPI app
  (Google Pay/PhonePe/Paytm/BHIM). A unique **booking reference**
  (e.g. `TRM-2026-7F3A91`) is generated and shown so the salon can match it.
- The app **never** shows "Payment Successful" after a UPI app returns. It shows
  "Waiting for the salon to verify your payment." The **salon owner manually
  verifies** the payment in the app; only then is the booking **confirmed**.
- (History: this replaced an old PayU split-payment system, which was fully
  removed.)

### B. Salon owner → TrimiT (subscription) = Razorpay. THIS is TrimiT's revenue.
- Owners get a **30-day free trial** when they sign up.
- After the trial, the owner must have an **active paid subscription**
  (**₹299/month** via **Razorpay**) or their access is **frozen** and their
  salon is **hidden/greyed** so customers can't book it.
- Razorpay is used ONLY for owner subscriptions, never for customer bookings.

## 3. Subscription lifecycle (how a salon stays active)
- `trial` / `active` / `grace_period` = **has access** (salon visible & bookable).
- `expired` / `cancelled` / `past_due` / `payment_failed` = **no access**
  (owner frozen, salon greyed, bookings blocked).
- The salon's visibility is a flag `salons.subscription_active`, kept in sync
  automatically by database triggers whenever the subscription status changes.

### Auto-activation after payment (the key requirement)
When an owner pays via Razorpay, the salon activates automatically by TWO paths:
1. **Immediate:** the app sends the Razorpay result to `POST /subscriptions/verify`,
   the backend checks the signature and sets status = `active` → trigger flips
   `subscription_active = true`.
2. **Authoritative (even if the app closes):** Razorpay calls the backend
   **webhook** `POST /api/v1/subscriptions/webhook`. On `subscription.charged` /
   `subscription.activated` it sets status = `active` (idempotent, deduped by
   event id). On `payment.failed` → `payment_failed`; on `subscription.halted` →
   `past_due`; on `subscription.cancelled` → `cancelled`.

## 4. Backend API (FastAPI, under /api/v1)
Customer UPI payments (`routers/payments.py`):
- `POST /payments/upi/initiate` — make + store the booking reference, return the
  `upi://pay` intent details.
- `POST /payments/upi/awaiting-verification` — customer says "I paid"; notify salon.
- `POST /payments/{booking_id}/verify` — **owner** verifies payment AND confirms
  the booking in one action.
- `POST /payments/{booking_id}/reject` — owner couldn't find the payment.
- `GET /payments/{booking_id}/status` — poll status.

Owner subscriptions (`routers/subscriptions.py`):
- `GET /subscriptions/status` and `/current` — trial days left, status, etc.
- `POST /subscriptions/create` — create a Razorpay subscription (returns the
  checkout payload). Returns `503 SUBSCRIPTION_GATEWAY_UNAVAILABLE` only if the
  Razorpay keys are missing.
- `POST /subscriptions/verify` — verify Razorpay signature → activate.
- `POST /subscriptions/cancel` — cancel now or at cycle end.
- `POST /subscriptions/webhook` — Razorpay webhook (signature-verified, idempotent).
- `POST /admin/grant-subscription` (admin token) — manually activate/extend an
  owner by N days (used if you collect money offline).

Enforcement: owner-only write endpoints return `402 SUBSCRIPTION_REQUIRED` when
access has lapsed; a customer booking a lapsed salon gets `403 SALON_UNAVAILABLE`.

## 5. Database (Supabase Postgres) — key tables/columns
- `bookings`: `status` (pending/confirmed/in_service/completed/cancelled/no_show),
  `payment_method` (salon_cash/upi), `payment_verification_status`
  (not_required/initiated/waiting_verification/verified/rejected/timeout),
  `booking_reference`, `expected_upi_id`, `verified_at/by`, `verification_notes`.
- `salons`: `upi_id`, `upi_qr_code`, `bank_name`, `account_holder_name`,
  `subscription_active`.
- `users`: `upi_id` (owner's UPI captured at signup, prefills the salon).
- `subscriptions`, `subscription_payments`, `subscription_events`, `webhook_logs`
  (Razorpay lifecycle + audit + idempotency).

Migrations applied to production: through `49_upi_manual_payments.sql` (confirmed).
**Pending to apply:** `50_subscription_30day_and_owner_upi.sql` (30-day trial +
fresh trial for existing owners + `users.upi_id`).

## 6. Configuration / secrets (already set in backend/.env)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID`,
  `RAZORPAY_WEBHOOK_SECRET` — all present (₹299/mo plan).
- `SUBSCRIPTION_ENFORCEMENT_ENABLED=true`, `SUBSCRIPTION_TRIAL_DAYS=30`.
- These must also be set on Render (production backend), and the Razorpay
  dashboard webhook must point to `https://<backend>/api/v1/subscriptions/webhook`
  using the same `RAZORPAY_WEBHOOK_SECRET`.

## 7. Onboarding
On the signup screen where a user picks **customer vs salon owner** and enters
their name, **owners must enter a UPI ID** (required, format `name@bank`). It is
stored on the user and used to prefill the salon's UPI ID so "Pay with UPI" works
immediately.

## 8. Current status (2026-06-28)
- Backend: full test suite **92 passed**. Customer UPI payments + owner Razorpay
  subscriptions + enforcement all implemented and wired.
- Mobile: type-check clean. Web: build clean.
- Razorpay subscription billing is **real** (was accidentally stubbed earlier in
  the project history; now restored to full parity using `httpx`, no SDK needed).

## 9. Still to do
1. Apply migration `50_...sql` in Supabase.
2. Confirm `RAZORPAY_*` env vars on Render + Razorpay webhook URL/secret.
3. Optional: schedule the daily expiry jobs with pg_cron
   (`expire_lapsed_trials()`, `expire_unverified_upi_payments()`).
4. New Play Store build for the mobile changes.
5. (Mobile only) Razorpay checkout uses a WebView; for best reliability consider
   the `react-native-razorpay` SDK later. The webhook still auto-activates
   regardless of the app path.
