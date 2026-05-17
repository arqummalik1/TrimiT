# Remaining steps — trimit.online (you are here)

**Already done (you said):** Resend · Supabase SMTP + URLs · Vercel · Expo `EXPO_PUBLIC_PUBLIC_SITE_URL`

**Still to do:** Render env vars · Hostinger DNS (no conflict) · optional `hello@` inbox · test signup

---

## 1. Do you need to “create” noreply@trimit.online?

### Short answer: **No mailbox required for sending**

| Address | Need Gmail/Hostinger inbox? | Purpose |
|---------|----------------------------|---------|
| `noreply@trimit.online` | **No** | Supabase sends signup/reset **through Resend**. Resend only needs **domain verified** in DNS. |
| `hello@trimit.online` | **Optional** | So **you can read** customer emails. Website already shows this address. |

**What you already did:** Resend verified `trimit.online` + Supabase SMTP with `noreply@trimit.online` = sending works.

**Optional later — receive mail at hello@:**

1. **Hostinger** → Email → create `hello@trimit.online` (if your plan includes email), **or**
2. Hostinger → **Forwarders** → forward `hello@trimit.online` → your personal Gmail, **or**
3. Resend **Receiving** (paid feature) — not required at launch.

You do **not** create `noreply@` in Hostinger for auth emails to work.

---

## 2. Render — where is `PUBLIC_SITE_URL`?

There is **no special “Public Site URL” page** on Render. It is a **custom environment variable** you add yourself.

### Steps (Render dashboard)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Open your **backend** service (name like `trimit-backend` or `trimit-az5h` — the **Python/FastAPI** API, not the static site).
3. Left sidebar → **Environment**
4. Click **+ Add Environment Variable**
5. Add these **two** rows:

| Key | Value |
|-----|--------|
| `PUBLIC_SITE_URL` | `https://trimit.online` |
| `ALLOWED_ORIGINS` | `https://trimit.online,https://www.trimit.online` |

6. Click **Save, rebuild, and deploy** (or **Save and deploy**).

Also confirm these already exist on the **same** backend service (from your secrets):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (if using payments)

**Why it matters:** Backend puts `https://trimit.online/auth/email-confirmed` and `/reset-password` into Supabase email links. Without `PUBLIC_SITE_URL`, links may still point at an old URL.

Docs: [Render — Environment variables](https://render.com/docs/configure-environment-variables)

### Do you need a custom domain on Render?

**No — for launch.**

| Service | URL | Custom domain? |
|---------|-----|----------------|
| **Website** | `https://trimit.online` | **Vercel** (you did this) |
| **API** | `https://trimit-az5h.onrender.com` | **Keep this** in mobile `.env` as `EXPO_PUBLIC_API_URL` |

Do **not** point `trimit.online` (apex) to Render if Vercel hosts the website — that causes the Hostinger “two different targets” error.

**Optional later:** `api.trimit.online` → CNAME to Render (subdomain only). Not required now.

---

## 3. Hostinger DNS — fix “pointing to two different things”

**Rule:** The **apex** (`@` / `trimit.online`) can only have **one** primary target for the **website**.

### Correct layout for TrimiT

| Type | Name / Host | Points to | Used for |
|------|-------------|-----------|----------|
| **A** | `@` | Vercel IP (e.g. `76.76.21.21`) | Website |
| **CNAME** | `www` | `cname.vercel-dns.com` (exact value from Vercel) | Website |
| **TXT** | `@` or `resend._domainkey` | From Resend dashboard | Email (SPF/DKIM) |
| **CNAME** | `resend._domainkey` etc. | From Resend | Email |

Resend records **do not** replace Vercel’s A record — they are **extra** records with different names.

### What causes conflicts

- Two **A** records on `@` (one Vercel, one Render) ❌
- **CNAME** on `@` and **A** record on `@` at the same time ❌
- Adding `trimit.online` as custom domain on **both** Vercel and Render ❌

### Fix in Hostinger

1. **Websites** → **DNS / Nameservers** for `trimit.online`
2. Delete **duplicate** `@` records — keep only Vercel’s **A** for website
3. Keep **all** Resend TXT/CNAME rows Resend gave you
4. In **Vercel** → Domains → confirm `trimit.online` = Valid
5. In **Resend** → Domains → confirm `trimit.online` = Verified

---

## 4. Vercel checklist (quick)

**Project → Settings → Environment Variables (Production):**

| Variable | Value |
|----------|--------|
| `REACT_APP_PUBLIC_SITE_URL` | `https://trimit.online` |
| `REACT_APP_BACKEND_URL` | `https://trimit-az5h.onrender.com` |
| `REACT_APP_SUPABASE_URL` | your Supabase URL |
| `REACT_APP_SUPABASE_ANON_KEY` | your anon key |

Redeploy after changes.

---

## 5. Mobile (you said Expo is set)

Your `mobile/.env` already has:

- `EXPO_PUBLIC_PUBLIC_SITE_URL=https://trimit.online` ✅
- `EXPO_PUBLIC_API_URL=https://trimit-az5h.onrender.com` ✅

For **Play Store builds**, set the same in **Expo dashboard** → project → **Environment variables** → production.

---

## 6. Final test order

1. Open `https://trimit.online` — loads ✅  
2. `https://trimit.online/privacy` — loads ✅  
3. Render backend → Environment has `PUBLIC_SITE_URL` → redeployed ✅  
4. Sign up with **new Gmail** (not Supabase team email)  
5. Email from `noreply@trimit.online` within 2 min  
6. Link opens `https://trimit.online/auth/email-confirmed`  
7. Sign in on app with same email/password  

If email fails: **Resend → Logs** + **Supabase → Authentication → Logs**

---

## 7. What the code repo already has (no action needed)

- Defaults use `https://trimit.online`
- Support email `hello@trimit.online` on contact pages
- `render.yaml` includes `PUBLIC_SITE_URL` if you deploy via Blueprint

**You** must still add env vars in Render dashboard if the service was created manually (dashboard overrides).

---

## Quick FAQ

**Q: Custom domain in Render email settings?**  
A: That’s for **sending mail from Render** — you are **not** using that. You use **Resend + Supabase**. Ignore Render email custom domain.

**Q: PUBLIC_SITE_URL on Render frontend static site?**  
A: Only needed on **backend** API service. Frontend on Vercel uses `REACT_APP_PUBLIC_SITE_URL`.

**Q: trimit.online.com?**  
A: Your domain is **`trimit.online`** (no `.com`).
