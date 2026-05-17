# trimit.online — Complete setup guide

**Canonical live site:** `https://trimit.online`  
**Also use:** `https://www.trimit.online` (redirect to apex in Vercel)

This guide covers, in order:

1. [EmailJS vs Resend (read this first)](#1-emailjs-vs-resend)
2. [Where you bought the domain (registrar DNS)](#2-registrar-dns-overview)
3. [Vercel — attach trimit.online to your web app](#3-vercel--attach-trimitonline)
4. [Resend — verify domain + SMTP for Supabase](#4-resend--verify-domain--smtp)
5. [Supabase — SMTP, Site URL, redirect URLs, rate limits](#5-supabase)
6. [Render — backend env (production API)](#6-render-backend)
7. [Vercel — frontend env vars](#7-vercel-frontend-env)
8. [Expo / mobile production build](#8-expo--mobile)
9. [Verification checklist](#9-verification-checklist)
10. [Repo already updated](#10-repo-already-updated)

---

## 1. EmailJS vs Resend

### Can TrimiT use EmailJS for signup / password-reset email?

**No — not for Supabase Auth emails.**

| | **EmailJS** | **Resend + Supabase Custom SMTP** |
|---|-------------|-----------------------------------|
| **What it is** | API to send emails from **your frontend** or a small backend script using templates | Real **SMTP** server for **Supabase Auth** to send system mail |
| **Used for** | Contact forms, “send us a message”, manual notifications | **Confirm signup**, **reset password**, **magic link**, **email change** |
| **Supabase integration** | ❌ Not supported as Auth SMTP | ✅ Official pattern |
| **Free tier** | **200 emails/month** (EmailJS “requests”) | Resend **~3,000 emails/month** on free tier |
| **After 200 emails** | Stops or requires paid plan | Scale on Resend paid tier |
| **Security** | Exposes send capability via public keys if misused | Auth emails sent server-side by Supabase |

**EmailJS limits (2026):** Free plan = **200 monthly requests**, 2 templates, 7-day history ([EmailJS pricing](https://www.emailjs.com/pricing)). Paid plans start around $9/month for more volume.

**Verdict for TrimiT**

- Keep EmailJS only if you want a **contact form** on the website (optional, separate feature).
- For **customer/owner signup and password reset**, you **must** use **Resend (or Brevo) + Supabase Custom SMTP**.

---

## 2. Registrar DNS overview

You own **`trimit.online`**. You will add DNS records in the place you **bought** the domain (Namecheap, GoDaddy, Cloudflare, Google Domains, etc.).

You need **two parallel setups** on the same domain:

| Purpose | Where configured | Record types |
|---------|------------------|--------------|
| **Website** (React app on Vercel) | Registrar DNS + Vercel Domains | `A` / `CNAME` |
| **Auth email** (Resend → Supabase) | Registrar DNS + Resend Domains | `TXT`, `CNAME` (DKIM) |

**Recommended sender address:** `noreply@trimit.online` or `auth@trimit.online`

---

## 3. Vercel — attach trimit.online

### Step 3.1 — Add domain in Vercel

1. [vercel.com](https://vercel.com) → your **TrimiT** project.
2. **Settings** → **Domains**.
3. Add:
   - `trimit.online`
   - `www.trimit.online`
4. Vercel shows required DNS records (copy them).

### Step 3.2 — DNS at your registrar

Typical Vercel setup:

| Host | Type | Value |
|------|------|--------|
| `@` (apex) | `A` | `76.76.21.21` (use **exact** IP Vercel shows) |
| `www` | `CNAME` | `cname.vercel-dns.com` (use **exact** target Vercel shows) |

Optional: redirect `www` → apex in Vercel (recommended).

Wait 5–60 minutes. Vercel should show **Valid Configuration**.

### Step 3.3 — Set production domain

In Vercel → Domains → set **`trimit.online`** as **primary** production domain.

### Step 3.4 — Environment variables (Vercel)

**Settings** → **Environment Variables** → **Production**:

| Variable | Value |
|----------|--------|
| `REACT_APP_PUBLIC_SITE_URL` | `https://trimit.online` |
| `REACT_APP_BACKEND_URL` | Your Render API URL (e.g. `https://trimit-az5h.onrender.com`) |
| `REACT_APP_SUPABASE_URL` | From Supabase → Settings → API |
| `REACT_APP_SUPABASE_ANON_KEY` | From Supabase → Settings → API |

**Redeploy** the frontend after saving.

### Step 3.5 — Smoke test website

Open in browser:

- https://trimit.online
- https://trimit.online/privacy
- https://trimit.online/auth/email-confirmed (page loads; may show “no token” — that’s OK)

---

## 4. Resend — verify domain + SMTP

### Step 4.1 — Create Resend account

1. [resend.com](https://resend.com) → Sign up.
2. **Domains** → **Add Domain** → enter `trimit.online`.

### Step 4.2 — Add DNS records (at registrar)

Resend shows records like:

- **TXT** — SPF (`v=spf1 include:...`)
- **CNAME** — DKIM (often 3 entries)

Add **every** record Resend lists. Do not skip.

Status → **Verified** (5–30 minutes, sometimes up to 48h).

### Step 4.3 — Create API key

1. Resend → **API Keys** → **Create**.
2. Copy key (`re_...`) — this is your **SMTP password**. Store in a password manager.

### Step 4.4 — SMTP credentials for Supabase

| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | Your Resend API key (`re_...`) |
| Sender email | `noreply@trimit.online` |
| Sender name | `TrimiT` |

---

## 5. Supabase

### Step 5.1 — Custom SMTP

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication** → **SMTP Settings** (or **Email** → SMTP).
3. **Enable custom SMTP** → paste Resend values from §4.4.
4. **Save**.

### Step 5.2 — URL configuration

**Authentication** → **URL configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | `https://trimit.online` |
| **Redirect URLs** (add each line) | `https://trimit.online/auth/email-confirmed` |
| | `https://trimit.online/reset-password` |
| | `https://www.trimit.online/auth/email-confirmed` |
| | `https://www.trimit.online/reset-password` |
| | `http://localhost:3000/auth/email-confirmed` |
| | `http://localhost:3000/reset-password` |

### Step 5.3 — Rate limits

**Authentication** → **Rate Limits**:

- Increase **email sent** limit (e.g. **100–200/hour** for launch).
- Save.

### Step 5.4 — Email templates (quick check)

**Authentication** → **Email Templates** → Confirm signup / Reset password:

- Links should point to your site (`{{ .SiteURL }}` / redirect URLs).
- After SMTP, test one real signup.

### Step 5.5 — Test email (critical)

1. Use a **new Gmail** not on your Supabase team.
2. Sign up as **customer** on mobile or web.
3. Email should arrive within **1–2 minutes** from `noreply@trimit.online`.
4. Link opens `https://trimit.online/auth/email-confirmed`.

If it fails, check **Resend → Logs** and **Supabase → Auth logs**.

---

## 6. Render backend

[Render Dashboard](https://dashboard.render.com) → **trimit-backend** → **Environment**:

| Variable | Value |
|----------|--------|
| `PUBLIC_SITE_URL` | `https://trimit.online` |
| `ALLOWED_ORIGINS` | `https://trimit.online,https://www.trimit.online` |

**Manual deploy** or push to `main` if `render.yaml` is wired.

`PUBLIC_SITE_URL` is used for:

- Signup confirmation `redirect_to`
- Forgot-password `redirect_to`

---

## 7. Vercel frontend env

Same as §3.4. Confirm after deploy:

```bash
curl -sI https://trimit.online | head -5
```

---

## 8. Expo / mobile

Before **production APK/AAB**:

### Local `.env` (mobile)

```env
EXPO_PUBLIC_PUBLIC_SITE_URL=https://trimit.online
```

### EAS / Expo dashboard

Set **`EXPO_PUBLIC_PUBLIC_SITE_URL`** = `https://trimit.online` for production profile.

Rebuild:

```bash
cd mobile && npm run verify:env && npm run build:aab:local
```

Legal links in-app (privacy, terms) read this URL automatically.

---

## 9. Verification checklist

Copy and tick off:

- [ ] `https://trimit.online` loads the app
- [ ] `https://trimit.online/privacy` returns 200
- [ ] Resend domain **Verified**
- [ ] Supabase SMTP **enabled**
- [ ] Supabase Site URL = `https://trimit.online`
- [ ] Redirect URLs include `/auth/email-confirmed` and `/reset-password`
- [ ] Render `PUBLIC_SITE_URL` = `https://trimit.online`
- [ ] Render `ALLOWED_ORIGINS` includes `trimit.online` + `www`
- [ ] Vercel `REACT_APP_PUBLIC_SITE_URL` = `https://trimit.online`
- [ ] Customer signup email received (non-team address)
- [ ] Confirmation link opens **trimit.online** verified page
- [ ] Forgot password email + reset works
- [ ] Play Console privacy URL updated to `https://trimit.online/privacy`

---

## 10. Repo already updated

Code defaults and docs now use **`https://trimit.online`** (no booking logic changed):

| Area | Files |
|------|--------|
| Web fallback URL | `frontend/src/config/site.js` |
| Mobile fallback URL | `mobile/src/lib/contactInfo.ts`, `app.config.js` |
| Backend defaults | `backend/config.py`, `backend/server.py` |
| Legal copy | `shared/legal/*`, `frontend/src/legal/content.js`, `mobile/src/legal/content.ts` |
| Env examples | `frontend/env.example`, `mobile/env.example` |
| Render blueprint | `render.yaml` |
| Checklists | `docs/PRODUCTION_LAUNCH_CHECKLIST.md`, etc. |

**You still must:** configure DNS, Vercel, Resend, Supabase, and cloud env vars (steps above). Pushing code alone does not switch production until those are done.

---

## Optional: keep old Vercel URL working

During migration you may keep `trimi-t.vercel.app` in Vercel as an alias. Add to Supabase redirect URLs if needed. Primary links in emails should use **`trimit.online`** only.

---

## Support links

- [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- Broader auth strategy: `docs/AUTH_SMTP_AND_PHONE_OTP_GUIDE.md`
