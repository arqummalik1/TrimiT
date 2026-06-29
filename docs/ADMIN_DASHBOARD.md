# TrimiT — Admin Dashboard Guide (founder-only)

> Plain-English guide to the private admin dashboard: how to open it, set it up,
> what it shows, and how it works. Web-only. Updated 2026-06-28.

---

## 1. What it is
A private, founder-only dashboard on the **website** (not the mobile app) where
you can see:
- Totals: customers, salon owners, salons, bookings.
- Subscriptions: who is **active**, on **trial** (with days left), or **expired/lapsed**.
- Money: MRR, ARR, total revenue collected.
- Website **visitors**: page views in the last 24h / 7d / 30d + unique visitors.
- A **salon owners** table (status badge, trial days left, renews/expires, UPI id)
  with a one-tap **"Grant 30 days"** button.
- A **customers** table.
With search + filters, skeleton loaders, a Refresh button, and a Lock button.

It is **not linked anywhere** — you reach it only by typing the URL — and it is
protected by a **PIN**.

---

## 2. How to open it
1. Go to **`https://trimit.online/admin`** (just type it in the address bar).
2. You'll see a lock screen. Enter your **PIN** and press **Unlock**.
3. The dashboard opens. Use **Lock** (top corner) to sign out.

That's it — no email, no password. Only the PIN.

---

## 3. One-time setup (so it actually works)
The dashboard reads live data from the backend, so two server settings must be in
place on **Render** (production backend):

| Env var | What | Status |
|--------|------|--------|
| `ADMIN_API_TOKEN` | The real admin key (already a 64-char secret) | ✅ already set |
| `ADMIN_DASHBOARD_PIN` | The PIN you type on the page (pick 6–10 digits) | ⚠️ **set this on Render** |

Steps:
1. Render → your backend service → **Environment** → add `ADMIN_DASHBOARD_PIN` = your chosen digits (e.g. a 8–10 digit number). Save (Render redeploys).
2. Database migrations `50` and `51` — **already applied** by you. ✅ (51 powers the visitor numbers; without it visitors just show 0.)
3. Web auto-deploys from `main` on Vercel — once merged, `/admin` is live.

> The PIN you set locally in `backend/.env` is `738261` (a placeholder). That only
> affects a locally-run backend. **Production uses the Render value** — set a
> strong one there.

---

## 4. What each part does
- **Overview cards** — live counts + subscription split + money + visitors. "Last updated" shows when the data was fetched; press **Refresh** to re-pull.
- **Salon owners table**
  - **Status badge**: green = active, blue = trial, amber = past_due/grace, red = expired/cancelled.
  - **Trial days left** shows for owners on trial (e.g. "12 days left").
  - **Renews / Expires** date for active/period subscriptions.
  - **UPI ID** so you can see who can take UPI bookings.
  - **Grant 30 days** — instantly activates/extends that owner by 30 days (use this when an owner pays you offline, e.g. by UPI/bank). The salon goes live again immediately.
  - **Search** (name/email/salon) + **status filter**.
- **Customers table** — name, email, phone, joined date + search.

---

## 5. How it works (architecture)
- **Login**: the page sends your PIN to `POST /api/v1/admin/login`. The server
  compares it (constant-time, **rate-limited 5/min**) and, if correct, returns the
  real `ADMIN_API_TOKEN`. The token is kept only in the browser tab's
  `sessionStorage` (`trimit.admin.token`) and cleared on Lock. **The real token
  never ships inside the app code — only the PIN does.**
- **Data**: every dashboard call sends `Authorization: Bearer <token>` to:
  - `GET /api/v1/admin/dashboard/overview`
  - `GET /api/v1/admin/dashboard/owners`
  - `GET /api/v1/admin/dashboard/customers`
  - `POST /api/v1/admin/grant-subscription` `{ owner_id, days }`
- **Subscription status** is computed with the SAME logic the app uses to enforce
  access (`subscription_service.compute_access`), so the dashboard never disagrees
  with what owners actually experience.
- **Visitors**: the public website pings `POST /api/v1/analytics/pageview` on each
  page change (a random, non-identifying session id in `localStorage`); the
  dashboard aggregates the `page_views` table. The `/admin` route is **not** tracked.

Key files: web `src/pages/admin/AdminDashboard.js`, `src/services/adminService.js`,
`src/lib/adminAuth.js`, `src/hooks/usePageviewTracker.js`; backend
`routers/admin.py`, `services/admin_dashboard.py`, `routers/analytics.py`,
`database/51_page_views_analytics.sql`.

---

## 6. Test it locally
By default the web app talks to the **production Render backend**, so the simplest
test is on the deployed site after setting `ADMIN_DASHBOARD_PIN` on Render:
1. Open `https://trimit.online/admin` → enter the PIN → you should see live data.

To run the whole thing locally instead:
1. Backend: `cd backend && venv/bin/uvicorn server:app --reload --port 8001` (uses `backend/.env`, PIN `738261`).
2. Web: in `frontend`, set `VITE_BACKEND_URL=http://localhost:8001` (e.g. in `frontend/.env`), then `npm run dev`.
3. Open the dev URL + `/admin` (e.g. `http://localhost:5173/admin`) → enter `738261`.

---

## 7. Security notes
- The PIN unlocks a server-held token; brute force is throttled (5 tries/min) and
  compared in constant time. Still, **use a long PIN (8–10 digits)** and keep the
  URL private.
- The dashboard is never linked or in the sitemap, and `/admin` page views aren't tracked.
- If a data call ever returns 401/403, the dashboard auto-locks and asks for the PIN again.

---

## 8. Troubleshooting
| Symptom | Cause / fix |
|--------|-------------|
| "Incorrect PIN" for the right PIN | `ADMIN_DASHBOARD_PIN` not set on Render, or set to a different value. |
| Lock screen says login disabled / 404 | `ADMIN_API_TOKEN` or `ADMIN_DASHBOARD_PIN` missing on the backend. |
| Visitors show 0 | Migration `51` not applied, or no traffic yet (it counts from when it's deployed). |
| Owners/customers empty | No data yet, or the backend can't reach Supabase — check the backend `/health`. |
| Dashboard can't load data locally | The web app points at Render by default; set `VITE_BACKEND_URL` to your local backend. |
