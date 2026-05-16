# Security Audit

**Date:** 2026-05-16  
**Risk level:** **HIGH** (several exploitable or abuse-prone gaps)

---

## Executive summary

TrimiT uses Supabase Auth (JWT) + RLS as the primary security boundary. The FastAPI layer adds optional HMAC signing and rate limiting, but **both are partially implemented**. The largest risks are **mock Razorpay verification**, **public RPC execution**, and **inert rate limiting**.

---

## Critical findings

### SEC-001: Rate limiting is a no-op
- **Severity:** Critical  
- **Location:** `backend/core/limiter.py`, `backend/server.py`  
- **Issue:** `Limiter` created; 20+ endpoints decorated; never `app.state.limiter = limiter`, no `SlowAPIMiddleware`.  
- **Impact:** Credential stuffing on login; booking/payment spam.  
- **Fix:** Wire SlowAPI per [SlowAPI docs](https://slowapi.readthedocs.io/); set `default_limits=["120/minute"]`.

### SEC-002: Mock Razorpay orders
- **Severity:** Critical  
- **Location:** `backend/routers/payments.py:28-30`  
- **Issue:** `order_id = f"order_{uuid...}"` — not created via Razorpay API.  
- **Impact:** Payment verification may accept forged signatures or fail all real payments.  
- **Fix:** `razorpay_client.order.create()`; persist order ID; verify amount + booking ownership.

### SEC-003: Payment verify lacks authorization
- **Severity:** Critical  
- **Location:** `backend/routers/payments.py:57-63`  
- **Issue:** PATCH booking `payment_status=paid` without checking caller owns booking.  
- **Fix:** Verify `booking.user_id == current_user.id` and amount matches.

### SEC-004: SECURITY DEFINER RPC IDOR
- **Severity:** Critical  
- **Location:** `database/20_create_atomic_booking_rpc.sql`, `database/22_create_slot_holds.sql`  
- **Issue:** `create_atomic_booking`, `reserve_slot_v1` accept `p_user_id` without `auth.uid()` check; callable by `anon` per Supabase advisor.  
- **Impact:** Direct PostgREST RPC could book/reserve as any user.  
- **Fix:** `REVOKE EXECUTE FROM anon, authenticated` on sensitive RPCs; only call via backend service role OR add `IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`.

### SEC-005: Client-bundled API signing secret
- **Severity:** High  
- **Location:** `mobile/src/lib/security.ts`, `EXPO_PUBLIC_API_SIGNING_SECRET`  
- **Issue:** HMAC secret in mobile bundle is extractable from AAB.  
- **Fix:** Remove client signing; rely on TLS + JWT. If needed, use short-lived server nonces.

### SEC-006: Web cannot sign requests
- **Severity:** High  
- **Location:** `frontend/src/lib/api.js` (no signing) vs `backend/core/middleware.py`  
- **Impact:** All web mutations 403 when signing enabled on Render.  
- **Fix:** Implement signing on web OR gate middleware on mobile-only user-agents (not recommended).

---

## High findings

| ID | Finding | Location | Fix |
|----|---------|----------|-----|
| SEC-007 | JWT unverified decode fallback | `dependencies/auth.py:43-49` | Require `JWT_SECRET` at startup |
| SEC-008 | CORS localhost always allowed + credentials | `server.py:97-102` | Gate on `ENVIRONMENT != production` |
| SEC-009 | Public slots use service role | `routers/bookings.py` | SECURITY DEFINER RPC returning occupancy only |
| SEC-010 | Uploads: no size cap, trust Content-Type | `routers/uploads.py` | 5MB cap + magic-byte validation |
| SEC-011 | `promo_usage` INSERT `WITH CHECK (true)` | `database/13_promo_codes.sql` | Restrict to service role or owner |
| SEC-012 | PII in INFO logs | `routers/owner.py`, `salons.py` | DEBUG-only, redact |
| SEC-013 | Tokens in localStorage (web) | `authStore.js` | Accept risk + CSP; or httpOnly cookie BFF |
| SEC-014 | `staff` router broken (500s) | `routers/staff.py` | Fix or unregister router |
| SEC-015 | Leaked password protection disabled | Supabase Auth advisor | Enable in Supabase dashboard |

---

## Medium findings

- **Idempotency optional** — replay risk on payments/bookings (`core/idempotency.py`)
- **Signature middleware fail-open** when secret unset
- **No Razorpay webhook** — client-only verify is insufficient
- **`staff_performance` SECURITY DEFINER view** — ERROR in Supabase linter
- **Public bucket listing** on `salon-images` — enumeration risk
- **Production API logging** in web `api.js` — token leakage in browser console

---

## Auth security (mobile vs web)

| Control | Mobile | Web |
|---------|--------|-----|
| Token storage | SecureStore ✅ | localStorage ⚠️ |
| Refresh token | Stored ✅ | Not stored ⚠️ |
| 401 handling | Modal + clear session ✅ | Hard redirect ⚠️ |
| Supabase RLS sync | `syncSupabaseAuthSession` ✅ | Missing ⚠️ |
| Password reset | Email only (browser) ⚠️ | Full in-app ✅ |
| Session bootstrap | `/auth/me` ✅ | `/auth/me` ✅ |

---

## OWASP-aligned checklist

| Category | Status |
|----------|--------|
| A01 Broken Access Control | ⚠️ RPC IDOR, payment verify |
| A02 Cryptographic Failures | ⚠️ Mock payments |
| A03 Injection | ✅ Parameterized via PostgREST |
| A04 Insecure Design | ⚠️ Client signing |
| A05 Security Misconfiguration | ⚠️ CORS, DEBUG default |
| A06 Vulnerable Components | ⚠️ Unused deps in requirements.txt |
| A07 Auth Failures | ⚠️ No rate limits |
| A08 Integrity Failures | ⚠️ No webhooks |
| A09 Logging Failures | ⚠️ PII logs |
| A10 SSRF | ✅ Low risk |

---

## Remediation priority

1. Wire rate limits (30 min)  
2. Fix Razorpay + verify authz (1 day)  
3. Harden RPC EXECUTE grants (2 hours)  
4. Add slot UNIQUE index (30 min)  
5. Web signing or disable middleware (2 hours)  
6. Revoke anon on `create_atomic_booking` (1 hour)  
7. Enable Supabase leaked password protection (5 min)
