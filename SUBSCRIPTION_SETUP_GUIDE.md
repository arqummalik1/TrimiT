# TrimiT Pro — Subscription Setup Guide

Complete, step-by-step setup to make the TrimiT Pro (₹299/month, Razorpay
recurring) subscription system fully live. Follow the steps **in order**. Each
step lists exactly what to click and **what should happen after** (the
outcome) so you always know it worked.

> Two-phase rollout:
> - **Phase 1 (do this first):** everything works, owners see trial + can
>   subscribe, but nothing is blocked. Safe for users on old app builds.
> - **Phase 2 (later, one switch):** unpaid owners get frozen + their salon is
>   greyed out for customers. Only flip after a subscription-aware app build is
>   live on the Play Store.

---

## 0. Prerequisites (1 minute)
| Need | Where |
|---|---|
| SQL `41` + `42` applied | ✅ Already done by you in Supabase |
| Razorpay account with **Subscriptions/Recurring** enabled | Razorpay Dashboard |
| Access to Render env vars | Render → your backend service |
| Access to Vercel env vars | Vercel → frontend project |
| `ADMIN_API_TOKEN` already set in backend | Render env (used for reminders) |

> If "Subscriptions" does not appear in your Razorpay dashboard left menu, open
> Razorpay → **Account & Settings → Configuration / Products**, and request /
> enable **Recurring Payments (Subscriptions)**. You cannot create a plan
> without it.

---

## 1. Razorpay — Create the TrimiT Pro Plan (get `RAZORPAY_PLAN_ID`)

> Do this **twice** if you use both Test and Live: once in **Test Mode**, once
> in **Live Mode**. The plan id is different per mode and must match the API
> keys you run with.

1. Log in to **Razorpay Dashboard**.
2. Top-right mode switch → choose **Test Mode** first (to test safely).
   - *Outcome:* the dashboard shows an orange "Test Mode" banner.
3. Left menu → **Subscriptions** → **Plans** tab → click **Create Plan**.
   - *Outcome:* a "Create Plan" form opens.
4. Fill the form:
   - **Plan name:** `TrimiT Pro`
   - **Billing frequency / interval:** `Monthly` (every 1 month)
   - **Amount:** `299` INR
   - **Description:** `TrimiT Pro monthly subscription`
   - (Leave free-trial/charge-now options default — the 14-day trial is handled
     by TrimiT's own backend, not Razorpay.)
5. Click **Create Plan**.
   - *Outcome:* the new plan appears in the Plans list with an id like
     `plan_Pxxxxxxxxxxxxx`.
6. Click the plan → **copy the Plan ID** (`plan_...`).
   - *This value = `RAZORPAY_PLAN_ID`.* Save it for Step 3.

✅ **Done when:** you have a `plan_...` id copied.

---

## 2. Razorpay — Create the Webhook (get `RAZORPAY_WEBHOOK_SECRET`)

The webhook is how Razorpay tells your backend "this owner was charged /
cancelled / failed", so subscriptions update automatically every month.

1. Razorpay Dashboard → **Account & Settings** → **Webhooks** (under "Website
   and app settings") → **Add New Webhook**.
   - *Outcome:* "Create Webhook" form opens.
2. **Webhook URL:** enter your live backend webhook endpoint:
   ```
   https://<YOUR-RENDER-HOST>/api/v1/subscriptions/webhook
   ```
   Example: `https://trimit-az5h.onrender.com/api/v1/subscriptions/webhook`
3. **Secret:** type a strong random string you choose (e.g. a 32-char random
   value). **Copy it** — Razorpay will not show it again.
   - *This value = `RAZORPAY_WEBHOOK_SECRET`.* Save it for Step 3.
4. **Alert Email:** your ops email (optional).
5. **Active events** — tick exactly these:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.completed`
   - `subscription.cancelled`
   - `subscription.halted`
   - `subscription.pending`
   - `payment.failed`
   - `payment.authorized` *(optional, logged only)*
6. Click **Create Webhook**.
   - *Outcome:* the webhook shows in the list with status **Active**.

✅ **Done when:** webhook is "Active" and you have the secret saved.

> Note: do this in the **same mode** (Test/Live) as your plan + keys. Test-mode
> webhooks only fire for test-mode payments.

---

## 3. Backend env vars (Render + local `.env`)

Set these on **Render → your backend service → Environment**:

| Variable | Value | Notes |
|---|---|---|
| `RAZORPAY_PLAN_ID` | `plan_...` from Step 1 | required to create subscriptions |
| `RAZORPAY_WEBHOOK_SECRET` | secret from Step 2 | required to verify webhooks |
| `SUBSCRIPTION_ENFORCEMENT_ENABLED` | `false` | **keep false for Phase 1** |
| `RAZORPAY_KEY_ID` | (already set) | must match the same mode as the plan |
| `RAZORPAY_KEY_SECRET` | (already set) | same mode |
| `ADMIN_API_TOKEN` | (already set) | used for the reminders cron |

Steps:
1. Render → service → **Environment** → **Add Environment Variable** for each
   row above → **Save Changes**.
   - *Outcome:* Render auto-redeploys the backend.
2. Also add the same `RAZORPAY_PLAN_ID` + `RAZORPAY_WEBHOOK_SECRET` to your
   local `backend/.env` (placeholders are already there) for local testing.

✅ **Done when:** Render finishes redeploy (green "Live").

---

## 4. Verify the backend is live

1. Health check:
   ```bash
   curl https://<YOUR-RENDER-HOST>/health
   ```
   - *Outcome:* JSON `{"status":"ok",...}`.
2. Status as an owner (replace token with a real owner JWT):
   ```bash
   curl https://<YOUR-RENDER-HOST>/api/v1/subscriptions/status \
     -H "Authorization: Bearer <OWNER_JWT>"
   ```
   - *Outcome:* JSON like
     `{"status":"trial","has_access":true,"is_trial":true,"trial_days_remaining":14,"enforcement_enabled":false}`.

✅ **Done when:** `/subscriptions/status` returns a trial for an owner.

---

## 5. Schedule daily trial reminders (2-day / 1-day / expired)

The backend has the endpoint; it just needs to be called once a day. Pick
**one** option.

### Option A — Render Cron Job (recommended, simplest)
1. Render → **New** → **Cron Job** (same repo/runtime as backend).
2. **Schedule:** `0 4 * * *` (daily 04:00 UTC ≈ 09:30 IST).
3. **Command:**
   ```bash
   curl -fsS -X POST https://<YOUR-RENDER-HOST>/api/v1/subscriptions/internal/run-reminders \
     -H "Authorization: Bearer $ADMIN_API_TOKEN"
   ```
4. Add `ADMIN_API_TOKEN` to the cron job's env (same value as backend).
   - *Outcome:* daily run returns `{"status":"ok","sent":{...}}`.

### Option B — Supabase pg_cron + pg_net (DB-driven)
Run once in the Supabase SQL Editor (replace host + token):
```sql
select cron.schedule(
  'trimit-subscription-reminders',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-RENDER-HOST>/api/v1/subscriptions/internal/run-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <ADMIN_API_TOKEN>')
  );
  $$
);
```
- *Outcome:* a `trimit-subscription-reminders` job appears in `cron.job`.
- Requires the `pg_net` extension (Database → Extensions → enable `pg_net`).

> Manual test any time:
> ```bash
> curl -X POST https://<YOUR-RENDER-HOST>/api/v1/subscriptions/internal/run-reminders \
>   -H "Authorization: Bearer <ADMIN_API_TOKEN>"
> ```
> *Outcome:* `{"status":"ok","sent":{"two_day":N,"one_day":N,"expired":N}}`.
> Re-running the same day will send 0 (deduped).

✅ **Done when:** the manual curl returns `"status":"ok"`.

---

## 6. Mobile app — enable + build

1. In the mobile build env (EAS secrets / `.env`), set:
   ```
   EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS=true
   EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT=false   # Phase 1
   ```
   - *Outcome:* owners see the trial banner + the "TrimiT Pro Subscription"
     entry under Settings.
2. Build:
   - Internal test APK: `npm run build:apk:local`
   - Play release AAB: `npm run build:aab:local` → upload to Play Console.
3. Razorpay checkout uses the in-app WebView (no native module needed) — works
   in Expo/managed builds.

✅ **Done when:** an owner can open Settings → TrimiT Pro and tap **Subscribe**
and the Razorpay sheet opens.

---

## 7. Web app — enable + deploy

1. Vercel → frontend project → **Settings → Environment Variables**:
   ```
   VITE_ENABLE_SUBSCRIPTIONS=true
   VITE_ENABLE_SUBSCRIPTION_ENFORCEMENT=false   # Phase 1
   ```
2. Redeploy (Vercel auto-deploys on push to `main`, or trigger manually).
   - *Outcome:* owners see `/owner/subscription` link in Settings; checkout opens
     via Razorpay popup.

✅ **Done when:** `/owner/subscription` loads and **Subscribe** opens Razorpay.

---

## 8. End-to-end test (Razorpay TEST mode)

Use **Test Mode** keys + test plan + test webhook.

1. Sign up a brand-new owner → create a salon.
   - *Outcome:* DB `subscriptions` row, `status=trial`, `trial_end` ≈ +14 days;
     `subscription_events` has `trial_started`.
2. Owner app/web → Settings → **TrimiT Pro** → **Subscribe**.
   - *Outcome:* Razorpay sheet opens for ₹299.
3. Pay with a **test card**: `4111 1111 1111 1111`, any future expiry, any CVV,
   OTP `1234` (Razorpay test flow).
   - *Outcome:* app shows "Subscription active"; DB `status=active`;
     `subscription_payments` row `captured`; owner gets a push.
4. Razorpay Dashboard → Webhooks → your webhook → **Send test / view logs**, or
   wait for `subscription.charged`.
   - *Outcome:* `webhook_logs` row with `processed=true`; sending the **same**
     event id again returns `{"duplicate":true}` (idempotent).
5. `GET /subscriptions/history` (owner) → shows the payment + total.
6. Owner → **Cancel subscription**.
   - *Outcome:* `cancel_at_period_end=true`; Razorpay subscription set to cancel
     at cycle end.
7. Admin analytics:
   ```bash
   curl https://<YOUR-RENDER-HOST>/api/v1/admin/subscriptions/analytics \
     -H "Authorization: Bearer <ADMIN_API_TOKEN>"
   ```
   - *Outcome:* counts + `mrr` + `arr`.

✅ **Phase 1 complete** when all of the above pass.

---

## 9. Receipt emails via Resend (optional but recommended)

Sends an automatic ₹299 payment receipt to the owner's email on **every**
successful charge (first payment + monthly renewals). If you skip this, payments
still work — only the email is skipped.

1. Create a [Resend](https://resend.com) account; verify your sending domain
   (e.g. `trimit.online`) under **Domains** (add the DNS records Resend shows).
   - *Outcome:* domain status **Verified**.
2. Resend → **API Keys** → **Create API Key** (Sending access). Copy it.
3. Set backend env (Render + local `.env`):
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>   # must be on the verified domain
   ```
   - *Outcome:* after the next paid charge, the owner receives a "TrimiT Pro
     receipt — ₹299" email. Backend logs `[Sub][Invoice] receipt sent`.

> No `RESEND_API_KEY` → receipts are silently skipped (logged), never an error.

## 10. Resubscribe / reactivation (already automatic)

No setup needed — this is built in:
- A **cancelled** or **expired** owner who pays again goes through the same
  Subscribe flow; the backend reactivates them (`status=active`), clears the
  cancellation flags, logs a `reactivated` event, sends a "Welcome back" push,
  and emails a receipt.
- Monthly auto-charges that recover a `past_due`/`payment_failed` owner also
  reactivate them automatically via the `subscription.charged` webhook.

## 11. Phase 2 — turn on enforcement (later)

Only after a subscription-aware app build is live on the Play Store.

1. Backend (Render): set `SUBSCRIPTION_ENFORCEMENT_ENABLED=true` → redeploy.
2. Mobile build: `EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT=true`.
3. Web (Vercel): `VITE_ENABLE_SUBSCRIPTION_ENFORCEMENT=true`.

What changes the moment enforcement is on:
| Who | Behaviour when subscription is inactive |
|---|---|
| Owner (app) | Full-screen "Subscription required" lock; cannot use the app |
| Owner (API) | Booking confirm/reject, services, staff, promos, analytics → `402` |
| Customer | The salon shows greyed-out + non-clickable in lists |
| Customer (API) | Booking creation against that salon → `403 SALON_UNAVAILABLE` |

> To instantly undo: set the three flags back to `false`. No data is lost.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `503 PLAN_NOT_CONFIGURED` on Subscribe | `RAZORPAY_PLAN_ID` empty/wrong mode | set plan id matching the active key mode |
| Checkout opens but `400 BAD_SIGNATURE` on verify | key secret mismatch (mode) | ensure `RAZORPAY_KEY_SECRET` matches the plan's mode |
| Webhook always `400 Invalid signature` | wrong `RAZORPAY_WEBHOOK_SECRET` | re-copy the secret you set on the webhook |
| Webhook `200` but nothing updates | event id unknown subscription | confirm the owner subscribed via the app (so `razorpay_subscription_id` is stored) |
| Owner has no `subscriptions` row | created before triggers / edge case | open Settings → TrimiT Pro once; `ensure_trial` creates it |
| Reminders send every run | dedupe relies on `subscription_events` | confirm SQL 41 applied (table exists) |
| Trial never expires | pg_cron not enabled | enable `pg_cron`, re-run the schedule block in SQL 41 |

---

## 13. Quick reference — env vars

**Backend (Render + local `.env`)**
```
RAZORPAY_PLAN_ID=plan_xxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SUBSCRIPTION_ENFORCEMENT_ENABLED=false      # true = Phase 2
RAZORPAY_KEY_ID=...        # already set, mode must match plan
RAZORPAY_KEY_SECRET=...    # already set, mode must match plan
ADMIN_API_TOKEN=...        # already set
RESEND_API_KEY=            # optional, enables receipt emails
RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>
```

**Mobile**
```
EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS=true
EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT=false   # true = Phase 2
```

**Web (Vercel)**
```
VITE_ENABLE_SUBSCRIPTIONS=true
VITE_ENABLE_SUBSCRIPTION_ENFORCEMENT=false          # true = Phase 2
```

**Webhook URL:** `https://<YOUR-RENDER-HOST>/api/v1/subscriptions/webhook`
