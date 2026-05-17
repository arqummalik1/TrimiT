# TrimiT Auth Guide: Custom SMTP + Phone OTP (India)

This document answers:

1. **Yes — use Custom SMTP first** (keep Supabase Auth; fix the “whole app can’t send email” problem).
2. **Step-by-step SMTP setup** for your Supabase project.
3. **Domain reality** (`vercel.com` vs `trimit.online` vs buying a domain).
4. **Phone OTP login for customers** (owners keep email/password) — feasibility, limits, cost, alternatives.
5. **Recommended roadmap** for TrimiT.

---

## Part 1 — Decisions at a glance

| Approach | Fixes email signup now? | Good for Indian customers? | Effort | Cost (early stage) |
|----------|-------------------------|----------------------------|--------|---------------------|
| **Custom SMTP + Supabase email auth** | **Yes** | Yes (email still works) | **Low (hours)** | ~$0–20/mo |
| **Phone OTP via Supabase + SMS provider** | N/A (replaces email login for customers) | **Yes** (if DLT + Indian SMS vendor) | **High (2–4 weeks dev)** | ~₹0.20–4 per OTP |
| **Auth0** | Yes (with Auth0 email/SMS config) | Yes | **Very high (weeks)** | Free tier limited; paid for scale |
| **Do nothing (default Supabase mailer)** | **No** | **No** | None | “Free” but **~2–4 emails/hour for entire project** |

**Recommendation for TrimiT today**

1. **This week:** Custom SMTP (Resend or Brevo) + verify DNS on **a domain you own**.
2. **Next product phase:** Phone OTP for **customers only** using Supabase Phone Auth + an India-friendly SMS API (MSG91 / 2Factor / Fast2SMS), not email for login.
3. **Defer Auth0** unless you need enterprise SSO later — SMTP solves the immediate production blocker.

---

## Part 2 — Why you hit the limit (so customers won’t)

### What went wrong in testing

- Supabase’s **built-in SMTP** is for **demo/team testing only**.
- Limits are **per Supabase project** (all users share one bucket), not per phone or per email.
- Official docs: rate is tied to `auth.rate_limits.email.inbuilt_smtp_per_hour` (often feels like **2–4/hour**); it can change.
- Until custom SMTP is enabled, Supabase may also **only send to emails on your Supabase organization team** — other addresses can fail with “Email address not authorized.”

### After custom SMTP

- Auth can email **any** user address.
- Supabase starts you at about **30 auth emails/hour**, then you **raise limits** in Dashboard → Authentication → Rate Limits.
- Your TrimiT backend also has its own limits (e.g. forgot-password **10/hour**, resend confirmation **6/hour**) — those protect abuse; they are **not** the same as the project-wide Supabase mailer wall.

**Customers are not “technical”** — they should never see “provider quota.” **SMTP + sensible rate limits + CAPTCHA later** is the fix, not switching error text.

---

## Part 3 — Domain: what you have vs what email needs

### Important clarifications

| What you said | Reality |
|---------------|---------|
| “I have Vercel domain” | **`vercel.com` is Vercel’s company domain — you cannot send email as `@vercel.com`.** |
| `https://trimit.online` | This is your **website** URL (hosted on Vercel). It works for **links in emails** (confirm, reset password). |
| Email (`no-reply@something.com`) | Requires a **domain you control in DNS** (TXT/MX records for SPF, DKIM, DMARC). |

**Production domain:** `trimit.online` — add Resend DNS records at your registrar (see `docs/TRIMIT_ONLINE_SETUP.md`). Do not use `*.vercel.app` for email authentication.

### What to do

**Option A — Best (recommended): buy a small domain**

Examples: `gettrimi.com`, `trimi-t.in`, `trimi.app` (~₹500–1500/year).

- Point **website** to Vercel (A/CNAME) — can stay `trimit.online` or use `www.gettrimi.com`.
- Point **email DNS** to Resend/Brevo (TXT/CNAME records).
- Send from: `noreply@gettrimi.com` or `auth@gettrimi.com`.

**Option B — Use an existing business domain**

Your docs mention `hello@trimit.online`. If **you own `audentix.com`**, you can use `noreply@audentix.com` for TrimiT auth email and add DNS records there.

**Option C — Sandbox only (not for real customers)**

Resend/Brevo test mode: send only to **your own verified inbox** until domain is verified. Fine for dev, **not** for Play Store launch.

---

## Part 4 — Custom SMTP on Supabase (step-by-step)

### Provider choice for TrimiT

| Provider | Why | Free tier | SMTP host |
|----------|-----|-----------|-----------|
| **Resend** | Official Supabase partner docs, simple | ~3,000 emails/mo on free | `smtp.resend.com` |
| **Brevo** (Sendinblue) | Good free tier, India-friendly | ~300 emails/day free | `smtp-relay.brevo.com` |
| SendGrid | Solid, more setup | 100/day free | `smtp.sendgrid.net` |

**Suggested path: Resend** (steps below). Brevo is a good backup.

---

### Phase A — Domain + Resend (30–60 minutes)

#### Step 1: Create Resend account

1. Go to [https://resend.com](https://resend.com) → Sign up.
2. Dashboard → **Domains** → **Add Domain**.
3. Enter your domain (e.g. `gettrimi.com`) — use a **subdomain for auth** if you want: `auth.gettrimi.com` (keeps marketing vs auth separate).

#### Step 2: Add DNS records

Resend shows records like:

- **TXT** (SPF)
- **CNAME** (DKIM, often 3 records)

Add them where you bought the domain (Namecheap, GoDaddy, Cloudflare, etc.) — **not** in Vercel unless Vercel is your DNS host for that domain.

Wait 5–30 minutes → Resend shows **Verified**.

#### Step 3: Create API key

1. Resend → **API Keys** → Create → copy key (starts with `re_...`).
2. This key is the **SMTP password**.

---

### Phase B — Connect SMTP in Supabase (10 minutes)

#### Step 4: Open Supabase SMTP settings

1. [Supabase Dashboard](https://supabase.com/dashboard) → your TrimiT project.
2. **Authentication** → **Email** (or **SMTP Settings** under Notifications).
3. Enable **Custom SMTP**.

#### Step 5: Enter Resend SMTP values

| Field | Value |
|-------|--------|
| **Host** | `smtp.resend.com` |
| **Port** | `465` (SSL) or `587` (TLS) — use what Supabase UI recommends |
| **Username** | `resend` |
| **Password** | Your Resend API key (`re_...`) |
| **Sender email** | `noreply@yourdomain.com` (must be on verified domain) |
| **Sender name** | `TrimiT` |

Save.

#### Step 6: Raise auth email rate limits

1. **Authentication** → **Rate Limits**.
2. Increase **Email sent** / SMTP limits to something realistic (e.g. **100–500/hour** for launch; scale later).
3. Keep OTP/SMS limits conservative until you enable phone login.

#### Step 7: Confirm redirect URLs (unchanged but required)

**Authentication** → **URL configuration**:

| Setting | Value |
|---------|--------|
| **Site URL** | `https://trimit.online` |
| **Redirect URLs** | `https://trimit.online/auth/email-confirmed` |
| | `https://trimit.online/reset-password` |
| | `http://localhost:3000/auth/email-confirmed` (dev) |
| | `http://localhost:3000/reset-password` (dev) |

#### Step 8: Email templates (optional polish)

**Authentication** → **Email Templates**:

- Confirm signup
- Reset password

Keep copy short; link to `trimit.online` pages your app already has (`EmailConfirmedPage`, reset password).

---

### Phase C — TrimiT app env (no code change required for SMTP)

Ensure production env matches:

| Where | Variable | Example |
|-------|----------|---------|
| Render (backend) | `PUBLIC_SITE_URL` | `https://trimit.online` |
| Vercel (frontend) | `REACT_APP_PUBLIC_SITE_URL` | same |
| Expo (mobile) | `EXPO_PUBLIC_PUBLIC_SITE_URL` | same |
| Render | `ALLOWED_ORIGINS` | includes `https://trimit.online` |

Redeploy **backend (Render)** and **frontend (Vercel)** after SMTP — SMTP is Supabase-side, but links in emails must match `PUBLIC_SITE_URL`.

---

### Phase D — Verification checklist

Do this **after** SMTP is on:

- [ ] Sign up **new customer** with a **Gmail address not on Supabase team** → email arrives within 2 minutes.
- [ ] Tap link → lands on `/auth/email-confirmed` → sign in on mobile.
- [ ] Forgot password once → reset email arrives.
- [ ] Spam folder check once; if mail goes to spam, fix DKIM/DMARC in Resend.
- [ ] Do **not** spam Sign up — one attempt per test email.

---

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Still “wait an hour” / quota | Old window not expired; or SMTP not saved | Wait 1h; confirm SMTP “enabled”; check Resend logs |
| “Email not authorized” | Still on default mailer | Enable custom SMTP |
| No email at all | Domain not verified | Finish DNS in Resend |
| Link opens wrong page | Redirect URL missing | Add URLs in Supabase |
| 429 from **your** API | TrimiT backend limit | Wait or use different email; limits are per-route |

---

## Part 5 — Phone OTP login (customers) — full picture

### Your idea (restated)

- **Customers:** sign in with **mobile number only** → receive **OTP via SMS** → enter OTP in TrimiT app → logged in.
- **Salon owners:** keep **email + password** (and email confirmation / reset flows).

This is a **good UX for India** and is **technically possible** with your current stack (Supabase Auth + mobile app), but it is a **product + compliance + cost** project, not a dashboard toggle.

### How it works with Supabase

1. Enable **Phone** provider in Supabase Auth.
2. Configure an **SMS provider** (Supabase does not send SMS for free):
   - Twilio / Twilio Verify (global, pricey in India)
   - MessageBird, Vonage
   - **TextLocal** (community-supported in Supabase; India-focused)
3. Mobile app calls:
   - `signInWithOtp({ phone: '+91XXXXXXXXXX' })` → SMS sent
   - User enters 6 digits → `verifyOtp({ phone, token, type: 'sms' })` → session JWT
4. Your backend already expects `Authorization: Bearer <Supabase JWT>` — **same as today**, but the user identity may be `phone` instead of `email` in `auth.users`.

### TrimiT code changes (estimate)

| Area | Work |
|------|------|
| Mobile customer auth | New screens: Enter phone → Enter OTP; remove email/password signup for `role=customer` |
| Mobile owner auth | **No change** (email/password) |
| `authStore` / `authRepository` | Branch: customer = phone OTP; owner = email |
| `users` table / profile | Store `phone` as primary identifier for customers; unique constraint on phone |
| Backend `/auth/signup` | Customer path may skip email signup; sync profile after OTP verify |
| Web dashboard | Owners only — minimal change |
| Testing | Real SIMs, rate limits, resend cooldown UI |

**Rough effort:** 2–4 weeks including India SMS compliance testing.

### Supabase “free tier” and SMS — be precise

| Item | Free plan reality |
|------|-------------------|
| Supabase project | Free tier exists (MAU limits apply) |
| **Built-in email SMTP** | Very low limit — **not for production** |
| **Custom SMTP email** | You pay email vendor (Resend free tier often enough at start) |
| **SMS / Phone OTP** | **Not included free.** You pay the SMS provider **per message**. Supabase does not absorb SMS cost. |
| Phone MFA add-on (advanced) | Paid add-on on Pro — **separate** from basic phone login |

**There is no meaningful “free unlimited OTP” on Supabase** for production Indian numbers.

### OTP rate limits (Supabase defaults)

Phone OTP has built-in throttles (configurable under **Rate Limits**):

- Minimum time between OTP requests per user (`auth.rate_limits.otp.period`).
- OTP expiry (`auth.rate_limits.otp.validity`) — often **60 seconds** to enter code.

You should mirror this in UI (“Resend OTP in 60s”) like you did for email.

---

## Part 6 — India: TRAI DLT (mandatory for production SMS)

For **commercial SMS to Indian mobile numbers**, TRAI requires **DLT registration**:

- Register **entity** (your company name).
- Register **sender ID** (6-char header, e.g. `TRIMIT`).
- Register **message templates** (OTP template text must match exactly what you send).

Without DLT, many OTPs **fail or get blocked** even if the API “works” in testing.

**Providers that help with India DLT**

| Provider | Notes |
|----------|--------|
| **MSG91** | Popular in India, OTP APIs, DLT tooling |
| **2Factor.in** | Simple OTP API |
| **Fast2SMS** | Budget OTP |
| **TextLocal** | Supported in Supabase; India DLT |
| **Twilio Verify** | Works; **expensive** in INR; DLT still your responsibility |

**Twilio is not “free OTP for India”** — trial credit is small; production is roughly **₹1.5–4+ per OTP** all-in.

---

## Part 7 — Alternatives for phone OTP (comparison)

### A) Supabase Phone Auth + Indian SMS vendor (recommended if staying on Supabase DB)

- **Pros:** Same JWT, same RLS, least migration pain.
- **Cons:** DLT setup; SMS cost; build new mobile flows.

### B) Firebase Authentication (Phone)

- **Pros:** Well-known phone flow; good mobile SDKs.
- **Cons:** **Second auth system** next to Supabase; sync users to Postgres; migration complexity.

### C) Auth0 Passwordless SMS

- **Pros:** Enterprise features.
- **Cons:** Cost; migration; still need SMS provider / DLT for India.

### D) MSG91 / 2Factor **directly** (custom backend OTP)

- Your FastAPI generates OTP, stores hash in Redis/DB, MSG91 sends SMS, you issue your own session or Supabase admin-created user.
- **Pros:** Full control, often **cheapest per OTP in India** (₹0.15–0.40 range at volume).
- **Cons:** **You** own security (brute force, OTP reuse, rate limits); more backend code.

### E) WhatsApp OTP (Meta)

- Possible via some providers; different templates and user expectation; not a full replacement for SMS for all users.

### Cost ballpark (India, order of magnitude)

| Solution | ~Cost per OTP | Free for production? |
|----------|---------------|----------------------|
| Default Supabase email | N/A | **No** (blocked quickly) |
| Resend + email login | per email (~₹0.01–0.10 effective at low volume) | Free tier for emails |
| Twilio Verify + SMS | ₹2–5+ | Trial only |
| MSG91 / 2Factor / Fast2SMS | ₹0.15–0.50 | Small signup credits only |
| Firebase Phone | Pay Google Cloud SMS | Limited trial |

At **1,000 customer sign-ins/month**, budget **₹200–500/month** for SMS with an Indian vendor; **₹2,000–5,000+** if you used Twilio Verify carelessly.

---

## Part 8 — Recommended product architecture (customers vs owners)

```
CUSTOMER (mobile)
  └─ Phone → OTP SMS → Supabase session (phone identity)
       └─ Profile: name, optional email later
       └─ API: Bearer JWT (unchanged)

OWNER (mobile + web)
  └─ Email + password → confirmation email (SMTP)
       └─ Forgot password via email (SMTP)
       └─ API: Bearer JWT (unchanged)
```

**Database considerations**

- `users.phone` unique for customers.
- Allow `email` nullable for phone-only customers OR use synthetic email `+91xxx@phone.trimi.local` (avoid if possible — use nullable email).
- RLS policies keyed on `auth.uid()` still work.

**Security**

- CAPTCHA on OTP send (Supabase supports CAPTCHA for auth).
- Max 3–5 OTP sends per phone per hour.
- 6-digit OTP, 60–120s expiry.
- Do not log OTP in app or backend logs.

---

## Part 9 — Implementation roadmap

### Wave 1 — Unblock launch (now)

| # | Task | Owner |
|---|------|--------|
| 1 | Buy domain OR use `audentix.com` if owned | You |
| 2 | Resend + DNS verify | You |
| 3 | Supabase Custom SMTP + rate limits | You |
| 4 | E2E signup + reset test | You / dev |
| 5 | Redeploy Render + Vercel env check | Dev |

**Outcome:** Owners and customers can use **email** signup reliably; no project-wide 2-email/hour wall.

### Wave 2 — Customer phone OTP (product)

| # | Task |
|---|------|
| 1 | Choose SMS vendor (MSG91 or TextLocal + Supabase) |
| 2 | Complete DLT registration |
| 3 | Enable Phone provider in Supabase; configure credentials |
| 4 | Mobile: `PhoneLoginScreen`, `OtpVerifyScreen` |
| 5 | Backend: profile upsert on first OTP login; `role=customer` |
| 6 | Keep owner flows on email |
| 7 | QA on Jio/Airti/Vi SIMs |

### Wave 3 — Optional polish

- CAPTCHA on auth
- WhatsApp OTP for owners (optional)
- Auth0 only if you need SSO / enterprise — **not required** if SMTP + phone OTP work

---

## Part 10 — Auth0: should you?

| Question | Answer |
|----------|--------|
| Does Auth0 fix email quota without SMTP? | **No** — you still configure email/SMS delivery. |
| Does Auth0 give free Indian OTP? | **No** — you connect Twilio etc. |
| When is Auth0 worth it? | Many social logins, enterprise SSO, centralized auth for multiple apps. |
| For TrimiT launch? | **SMTP first.** Phone OTP second. Auth0 only if you have a strong business reason. |

---

## Part 11 — Quick answers to your exact questions

1. **“We will go with SMTP, right?”**  
   **Yes.** That is the correct immediate fix.

2. **“I only have Vercel domain.”**  
   Use `trimit.online` for **website links**. For **sending email**, buy a domain or use a domain you already own (e.g. audentix.com). **`vercel.com` is not usable.**

3. **“Can customers use only mobile OTP?”**  
   **Yes,** with Supabase Phone Auth + paid SMS provider + DLT in India. Owners can stay on email/password.

4. **“OTP shows in app and user is logged in?”**  
   User receives SMS on their phone → types OTP **in the app** → app calls `verifyOtp` → session created → app stores JWT (same pattern as today).

5. **“Supabase free OTP limit?”**  
   **No free production OTP quota.** You pay per SMS. Email on free Supabase is severely limited until custom SMTP.

6. **“Free OTP services?”**  
   Only **small trials** (Twilio trial, MSG91 credits). Plan for **paid per OTP** at launch.

---

## Part 12 — Links

- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase: Phone login](https://supabase.com/docs/guides/auth/phone-login)
- TrimiT checklist: `docs/PRODUCTION_LAUNCH_CHECKLIST.md`
- TrimiT email confirm page: `frontend/src/pages/EmailConfirmedPage.js`

---

*Last updated: 2026-05-17 — adjust pricing with your chosen SMS vendor before budgeting.*
