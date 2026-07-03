# TrimiT — Admin Dashboard Guide (founder-only)

> Premium control center at `/admin` with charts, user management, and subscription control.
> Web-only, PIN-gated. Updated 2026-06-29.

---

## 1. What it is

A private, founder-only dashboard on the **website** (not mobile app) with:

### Overview Stats (12 cards)
- Totals: Customers, Salon Owners, Salons, Bookings
- Money: MRR, ARR, Total Revenue
- Subscriptions: Active, Trials, Expired
- Traffic: Page Views (24h/7d/30d), Unique Visitors

### Interactive Charts (recharts)
1. **Revenue Trend** — 30-day area chart
2. **Subscription Breakdown** — Pie chart (Active/Trial/Expired)
3. **User Growth** — 12-month area chart
4. **Bookings by Status** — Bar chart

### User Management
- **Owners table:** Name, Salon, Contact, UPI ID, Status, Trial Days, Actions
- **Customers table:** Name, Email, Phone, Joined, Actions
- **Actions:**
  - **Grant Subscription** — Extend owner's subscription by 30 days
  - **Block** — Prevent user from accessing the app
  - **Unblock** — Restore user access
  - **Delete** — Soft delete user (sets `deleted_at`)
  - **Invite** — Send invitation email to new owner/customer

### Search & Filters
- Status filter dropdown (All/Active/Trial/Grace/Expired/Blocked)
- Search by name, email, salon name, or phone

---

## 2. How to open it

1. Go to **`https://trimit.online/admin`** (type it in address bar)
2. Enter your **PIN** (6–10 digits) and press **Unlock**
3. Dashboard opens with real-time data
4. Use **Lock** button to sign out

---

## 3. One-time setup

| Env var | What | Status |
|--------|------|--------|
| `ADMIN_API_TOKEN` | Admin bearer key | ✅ already set |
| `ADMIN_DASHBOARD_PIN` | PIN you type | ⚠️ **set on Render** |

### Steps:
1. **Render** → backend service → Environment → add `ADMIN_DASHBOARD_PIN` = your chosen digits
2. **Apply migrations** in Supabase SQL Editor:
   - `51_page_views_analytics.sql` ✅ (already applied)
   - `52_user_management.sql` — **NEW** — adds `is_blocked`, `deleted_at` columns
3. Merge to `main` → Vercel auto-deploys

---

## 4. What each part does

### Charts
- **Revenue Trend:** Daily revenue over 30 days (area chart)
- **Subscriptions:** Breakdown of Active/Trial/Expired users
- **User Growth:** Monthly owner and customer signups
- **Bookings:** Count by status (Pending/Confirmed/Completed/Cancelled)

### Owners Table
- **Status badge:** Active (green), Trial (blue), Grace (amber), Expired (red)
- **Trial days left:** Shows remaining days for trial users
- **Grant 30 days:** Instantly activates/extends subscription (for offline payments)
- **Block:** Prevents owner from accessing the app
- **Delete:** Soft-deletes the owner account

### Customers Table
- View all customer data
- Block/delete customers who violate terms
- Invite new customers via email

---

## 5. How it works (architecture)

### Frontend
| File | Purpose |
|------|---------|
| `pages/admin/AdminDashboard.js` | UI, charts, tables, modals |
| `services/adminService.js` | API client (dedicated axios) |
| `lib/adminAuth.js` | Token storage (sessionStorage) |

### Backend
| File | Purpose |
|------|---------|
| `routers/admin.py` | Login, dashboard data, user management |
| `services/admin_dashboard.py` | Data aggregation queries |

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /admin/login` | Exchange PIN for bearer token |
| `GET /admin/dashboard/overview` | Stats + subscription breakdown |
| `GET /admin/dashboard/owners` | Owners list with subscription info |
| `GET /admin/dashboard/customers` | Customers list |
| `POST /admin/grant-subscription` | Extend owner subscription |
| `POST /admin/users/block` | Block a user |
| `POST /admin/users/unblock` | Unblock a user |
| `DELETE /admin/users/{id}` | Soft delete a user |
| `POST /admin/users/invite` | Send invitation email |

### Database
| Migration | Tables/Columns |
|-----------|----------------|
| `51_page_views_analytics.sql` | `page_views` table |
| `52_user_management.sql` | `users.is_blocked`, `users.deleted_at` |

---

## 6. Security

- **PIN-protected:** Rate-limited (5/min), constant-time comparison
- **Token never in code:** PIN exchanged for bearer token server-side
- **Bearer auth:** All endpoints require valid admin token
- **Auto-lock:** 401/403 clears token, returns to PIN screen
- **Not indexed:** `/admin` not linked, not prerendered, not in sitemap

---

## 7. Troubleshooting

| Symptom | Fix |
|--------|-----|
| "Incorrect PIN" | `ADMIN_DASHBOARD_PIN` not set on Render or wrong value |
| Login disabled / 404 | `ADMIN_API_TOKEN` or `ADMIN_DASHBOARD_PIN` missing |
| Block/Delete fails | Apply migration `52_user_management.sql` |
| Charts show no data | Data accumulates after migrations applied |
| Visitors show 0 | Migration `51` not applied, or no traffic yet |
