# Billu Partner vs TrimiT — Honest Gap Analysis

**Document type:** Competitive / product gap analysis  
**Audience:** TrimiT founders & product team  
**Created:** 10 July 2026  
**Status:** Reference — no code changes implied by this document alone

**Research basis:** Billu public partner FAQs ([profile](https://help.billu.care/profile), [general](https://help.billu.care/general), [marketing](https://help.billu.care/marketing), [appointment](https://help.billu.care/appointment), [payment](https://help.billu.care/payment)), Billu partner landing pages, and TrimiT codebase review (owner flows, salon/service models, auth).

---

## Executive summary

**Verification is a real gap.** Today anyone can sign up as a business owner on TrimiT with phone + email + UPI — no Aadhaar, PAN, shop proof, or admin approval. Billu is stricter: **owner ID is mandatory**, listings stay **“under verification” for 24–48h**, and **unverified salons don’t go live**.

**Service setup is a real gap.** Billu uses a **pre-built catalog** (pick category → pick service → set price). TrimiT is **fully manual** (create categories → type service name → price/duration → optional photo upload).

Billu is a **mature partner-ops + marketing platform** (100k+ partners, CRM, deals, walk-ins). TrimiT is **stronger on booking tech** (slot grid, map pin, real-time, direct UPI) but **weaker on trust, onboarding speed, and partner growth tools**.

---

## 1. How Billu manages salons (partner side)

| Area | Billu Partner |
|------|----------------|
| **Signup** | Free. Mobile-only. Register → build profile → upload docs |
| **Verification** | **Mandatory owner ID** (no relative’s ID). 24–48h review. “Application under verification” state |
| **GST / PAN** | **Not mandatory** — recommended for trust |
| **Shop registration / lease** | **Not mentioned** in their FAQs — they don’t appear to require it |
| **Location** | Owner sets location; **changes sent to admin for approval** (~24h) |
| **Name / cover photo** | Changes need **approval** |
| **Listing tiers** | Premium / Luxury / Standard / Basic |
| **Facilities** | AC, parking, etc. — checkbox list on profile |
| **Portfolio** | Separate work photos/videos + social links |
| **Working hours** | Per-day slots, toggle slots on/off, **holidays** |
| **Staff** | Add staff + expertise; **sub-admins** (bookings, promos, services — no bank access) |
| **Payments** | Billu collects online → **2.5% fee** → bank transfer in ~2 days. Withdrawal needs OTP |
| **Go-to-market** | Deals, happy hours, message blast, invite & earn (BCP points), customer import |

---

## 2. How Billu creates services

Flow (from Billu FAQ):

> **Service Setup → Select category → Add Service → Select from the list → Set Price → Submit**

- Owners **don’t invent** service names or hunt for images
- Services can be **disabled via toggle** without deleting
- Categories are **platform-defined**, not owner-created

Billu optimizes for **speed and consistency**. TrimiT optimizes for **flexibility** but creates **high onboarding friction**.

---

## 3. How TrimiT works today (owner side)

| Step | TrimiT today |
|------|----------------|
| **Signup** | Pick “Business owner” → name, phone, **UPI ID required** → terms |
| **KYC / docs** | **None** |
| **Admin approval** | **None** — salon is live after create |
| **Salon profile** | Name, address, city, **map pin (required)**, phone, open/close time, up to 3 photos |
| **Categories** | Owner creates manually (“Hair”, “Face”, etc.) |
| **Services** | Owner types name, price, duration, description; **photo optional** but UI pushes it |
| **Staff** | Built (management screen exists); staff selection on booking is feature-flagged |
| **Promos** | Promo codes (not Billu-style deals/happy hours) |
| **Payments** | **Direct UPI to salon** — owner manually verifies payment |
| **Subscription** | TrimiT Pro trial + paid plan (Billu was free, fee after ~6 months) |
| **Close salon** | Pause / closed today / N days / indefinite — good, but no per-day hour grid |
| **“Verified” in marketing** | SEO/copy says “verified listings” — **no verification pipeline behind it** |

### TrimiT code references (owner flows)

- Salon create: `mobile/src/screens/owner/ManageSalonScreen.tsx`
- Service create: `mobile/src/screens/owner/ManageServicesScreen.tsx`
- Owner signup: `mobile/src/screens/auth/CompleteProfileScreen.tsx`
- Salon API: `backend/routers/salons.py`, `backend/models/salons.py`

---

## 4. Side-by-side: what we have vs what we’re missing

### 4.1 Critical gaps (trust + quality)

| Gap | Billu | TrimiT | Risk if we ignore |
|-----|-------|--------|-------------------|
| **Owner identity verification** | Mandatory ID, owner-only | None | Fake salons, fraud, customer trust loss |
| **Listing approval gate** | 24–48h review before live | Instant live | Junk listings on Discover |
| **Location/name change approval** | Admin review | Owner edits freely | Wrong pin, impersonation |
| **Verified badge with meaning** | Tied to ID + review | Marketing only | Legal/reputation risk |

### 4.2 Onboarding friction (why salons churn at setup)

| Gap | Billu | TrimiT |
|-----|-------|--------|
| **Service catalog** | Pick from list + price | Manual everything |
| **Default service images** | Platform provides | Owner must upload (optional but pushed) |
| **Facilities checklist** | Yes | No |
| **App tutorial / onboarding videos** | Yes | Minimal guided setup |

### 4.3 Partner growth & retention (Billu’s real moat)

| Feature | Billu | TrimiT |
|---------|-------|--------|
| **Deals** (multi-service bundles) | Yes (up to 5 active) | Per-service offer toggle only |
| **Happy hours** (time + day + service discounts) | Yes | No |
| **Customer CRM** (list, spend, services) | Yes | No |
| **Walk-in booking** | Full flow | No |
| **Message blast to customers** | Yes | No |
| **Invite & earn / referral** | Yes (BCP) | No |
| **Portfolio / work videos** | Yes | Salon photos only (max 3) |
| **Social media links** | Yes | No |
| **Performance reports** (revenue, staff, deals) | Yes | Dashboard analytics (good start) |

### 4.4 Booking operations

| Feature | Billu | TrimiT |
|---------|-------|--------|
| **Accept/reject before confirm** | Yes | Auto-accept toggle |
| **4-digit booking code + QR start** | Yes (online) | No |
| **Pending jobs / Finish job** | Yes | Status flow exists, less ops-focused |
| **Missed booking reschedule** | Yes | Limited |
| **Add services mid-booking** | Yes | No |
| **In-app call (hide customer number)** | Yes | No |
| **Walk-in with customer import** | Yes | No |

### 4.5 Payments & money

| Feature | Billu | TrimiT |
|---------|-------|--------|
| **Platform collects online payment** | Yes | No — direct UPI |
| **Automatic settlement to bank** | Yes (~2 days) | N/A |
| **Cash discount reimbursement** | Billu pays salon | N/A |
| **Withdrawal OTP security** | Yes | N/A (no wallet) |

### 4.6 Where TrimiT is ahead (don’t lose this)

- **Slot-based booking** with real-time holds — Billu is more appointment-list oriented
- **Map pin enforcement** — stronger location integrity at create time
- **Gender serve / discovery filters** — men / women / unisex
- **Salon close sheet** with timed reopen — clean ops UX
- **Direct UPI** — salon keeps 100%, no 2.5% platform cut
- **Staff module** (when enabled) — deeper than Billu’s basic staff list
- **Subscription model** — sustainable revenue vs Billu’s “free then fee”

---

## 5. Verification — recommendation

**Yes, we need verification. Today we’re exposed.**

### Phase 1 — Must-have before scaling owners (MVP trust)

- **Owner government ID** (Aadhaar or PAN or Driving Licence) — upload + manual/admin review
- **Selfie / live photo** match (optional but strong)
- **Salon goes to `pending_verification`** — hidden from customers until approved
- **Phone OTP** already done — keep it

### Phase 2 — Stronger trust (after first 50–100 salons)

- **Shop proof** — one of: GST certificate, Shop & Establishment, trade licence, or **rent/lease agreement + shop-front photo**
- **Geo-verification** — admin compares pin vs shop-front photo
- **Re-verification** on address change (Billu does this)

### Phase 3 — Optional / trust boosters

- GST (optional badge “GST registered”)
- Bank account verification (penny drop) if we ever hold money

### What Billu actually requires

- Owner ID only (no relative’s ID)
- GST and PAN are **not mandatory**
- Shop registration / lease is **not mentioned** in their public FAQs

We can **beat Billu on trust** without blocking small parlours, but **ID + admin review is non-negotiable**.

### What we should NOT copy blindly

Billu’s “no alternative to ID” is harsh for home stylists. TrimiT product rules already treat home stylist as out of scope — so an **ID gate is appropriate for our salon/parlour owners**.

---

## 6. Service catalog — recommendation

| Approach | Pros | Cons |
|----------|------|------|
| **Keep fully manual (status quo)** | Flexible, unique menus | Slow onboarding, empty/bad listings, owners skip photos |
| **Billu-style catalog** | 5-min setup, consistent UX, default images | Needs curated Indian salon taxonomy |
| **Hybrid (recommended)** | Catalog pick + “custom service” escape hatch | Slightly more build |

**Hybrid is the right call:** ~80% pick from catalog (Haircut Men, Threading, Facial, etc.) with default image + price edit; ~20% custom for specialty salons.

---

## 7. Priority roadmap

### P0 — Trust (do before marketing “verified salons”)

1. Owner KYC upload + admin review queue
2. `verification_status` on salons — don’t show on Discover until `approved`
3. Fix marketing copy until pipeline exists

### P1 — Onboarding speed (compete with Billu signup)

4. Master service catalog with categories
5. Default service images
6. Facilities checklist on salon profile

### P2 — Partner retention

7. Walk-in booking + customer list (light CRM)
8. Happy hours / deals (beyond promo codes)
9. Portfolio section (work photos separate from shop photos)

### P3 — Growth

10. Push campaigns to past customers
11. Referral program
12. Sub-admin roles for staff

---

## 8. Bottom line

- **Billu won on partner ops and trust**, not on booking technology. They made it **easy to list** (catalog services) and **hard to fake** (ID + review).
- **TrimiT won on booking UX and direct payments**, but we’re **listing fake-ready salons today** — that’s the biggest gap.
- **PAN/Aadhaar:** Yes for owner identity. **Shop registration/lease:** Phase 2, not day-one — Billu doesn’t require it either, but we should add it as we scale.
- **Service images:** We’re harder than Billu needs to be. Catalog + defaults fixes this without dropping quality.

**Recommended sequence:** Ship **ID verification + approval gate** before any big owner acquisition push. In parallel, design the **service catalog** — that’s the second-biggest reason owners will prefer Billu’s 30-second setup over ours.

---

## Appendix A — Billu partner FAQ highlights

### Identity & onboarding (General FAQ)

- Q6 / Q38: ID required so Billu lists only genuine, verified salons
- Q18 / Q47: No alternative to providing identification
- Q23: Verification typically 24–48 hours
- Q4 / Q5: GST and PAN not mandatory, recommended for trust
- Q29: Location updates sent to admin for verification (~24h)
- Q31: Free registration now; minimal fee on service amount after 6 months

### Services (Profile FAQ)

- Q7 / Q29: Service Setup → category → Add Service → select from list → set price → submit
- Q16 / Q38: Disable service via toggle without deleting

### Marketing (Marketing FAQ)

- Deals: up to 5 active; multi-service bundles with discounts
- Happy hours: time period, days, slots, services, discount — unlimited promotions

### Appointments (Appointment FAQ)

- Walk-in: name, mobile, email, DOB, service, date, time → Start Job → Complete Job
- Online: 4-digit booking code from customer; QR scan required to start online booking
- Pending jobs on dashboard; missed bookings section for paid online bookings

### Payments (Payment FAQ)

- Online payments: 2.5% bank transfer fee deducted; remainder to salon in ~2 days
- Bank account add requires OTP on registered mobile
- Withdrawal requires OTP per transaction

---

## Appendix B — TrimiT feature flags (owner capabilities)

From `mobile/src/lib/featureFlags.ts`:

| Flag | Default | Notes |
|------|---------|-------|
| `ENABLE_STAFF_SELECTION` | Off | Staff picker on customer booking |
| `ENABLE_MULTI_BOOKING_PER_SLOT` | Off | One booking per slot in v1 |
| `ENABLE_OWNER_PROMO_MANAGEMENT` | On | Promo codes screen |
| `ENABLE_SUBSCRIPTIONS` | On | TrimiT Pro trial + paid plan |
| `ENABLE_SUBSCRIPTION_ENFORCEMENT` | On | Owner app freeze when lapsed |

---

## Revision history

| Date | Author | Notes |
|------|--------|-------|
| 2026-07-10 | Product analysis (Cursor) | Initial document from Billu FAQ research + TrimiT codebase review |
