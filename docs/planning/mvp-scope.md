# MVP Scope Definition

What ships in v1.0 vs what waits for later phases.

---

## In scope (MVP v1.0)

### Customer (mobile — primary)
- [x] Email auth (signup, login, logout)
- [x] Discover salons by location
- [x] View salon/services
- [x] Book slot with hold timer
- [x] Pay at salon (cash flow)
- [x] Pay online (Razorpay WebView) — **needs backend fix**
- [x] My bookings, cancel, reschedule
- [x] Push notifications + preferences
- [x] Write review after completion
- [x] Account deletion

### Owner (mobile + web)
- [x] Owner signup + salon profile
- [x] Manage services
- [x] Accept/reject/complete bookings
- [x] Dashboard stats
- [x] Promo codes
- [x] Staff management — **backend broken; mobile UI exists**
- [x] Push on new bookings

### Web (secondary)
- [x] Customer discover + cash book
- [x] Owner full management
- [x] Password reset (full flow)
- [ ] Online payment — **out of MVP for web**
- [ ] Map view — **out of MVP**

### Backend
- [x] Versioned REST API `/api/v1`
- [x] Supabase Auth + RLS
- [x] Atomic booking RPC
- [x] Slot holds
- [x] Expo push pipeline
- [ ] Production Razorpay — **required before public launch**

---

## Out of scope (post-MVP)

| Feature | Phase | Reason |
|---------|-------|--------|
| iOS App Store | Phase 2 | Android-first launch |
| Web Razorpay | Phase 2 | Mobile-first payments |
| In-app chat | Phase 3 | Not core loop |
| Loyalty / subscriptions | Phase 3 | Revenue complexity |
| Multi-language | Phase 3 | Market expansion |
| Salon chains / franchises | Phase 3 | Data model change |
| Admin super-dashboard | Phase 2 | Ops tooling |
| Email notifications | Phase 2 | Push sufficient for MVP |
| Advanced analytics | Phase 2 | Stub today |
| Social login (Google) | Phase 2 | Supabase supports later |

---

## MVP quality bar

| Area | Minimum bar |
|------|-------------|
| Uptime | 99% (Render + Supabase) |
| Booking correctness | No double-book at same slot |
| Auth | Session survives app restart |
| Security | Rate limits + no public RPC abuse |
| Legal | Privacy, terms, deletion URL live |
| Support | Contact email/phone responsive <24h |

---

## Launch modes

### Mode A: Cash-only beta (fastest — ~5 days)
- Disable Razorpay in app config
- Ship internal Play track
- Web + mobile cash bookings only
- Fix rate limits + web signing

### Mode B: Full MVP (recommended — ~12 days)
- Mode A + real Razorpay + payment sweeper
- Play Store internal → closed production

### Mode C: Web-first beta (not recommended)
- Web only, no Play Store
- Loses primary user acquisition channel for India salon market

**Recommendation:** **Mode B** with Mode A as Week 1 fallback if Razorpay slips.
