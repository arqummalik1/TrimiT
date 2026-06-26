# TrimiT — PayU Split Payments: Implementation Document

> **Audience:** beginners. This explains what was built, why, and how it all fits
> together — in plain language. No prior payments knowledge assumed.
>
> Companion doc: **`PAYU_SETUP_GUIDE.md`** (how to configure, deploy, verify, and test).

---

## 1. What problem does this solve?

TrimiT is a salon marketplace. A customer books a service at a salon and pays.
We want that money to go **automatically** to the **right salon owner's bank
account**, while TrimiT keeps a small commission — without anyone moving money
by hand.

This is called a **split payment** (or "marketplace settlement"): one customer
payment is automatically split between the salon and the platform.

We use **PayU** (an Indian payment gateway) to do this.

---

## 2. The money flow in plain words

When a customer pays, say, **₹100** for a booking:

| Who | Gets | Why |
|---|---|---|
| **Salon owner** | ~₹93 | their earnings |
| **TrimiT (you)** | ₹5 | platform commission (5%, configurable) |
| **PayU** | ~₹2 | the gateway's own fee (~2%) |

So the salon owner is told clearly: **"about 7% total is deducted, you receive
about 93%."**

**Important truth:** "paid" is **not** the same as "money in the salon's bank."
PayU sends the salon's share to their bank a day or two later (called
**settlement**). So we track two separate things:

- **payment_status** — did the customer pay? (`paid`, `failed`, etc.)
- **settlement_status** — did the money reach the salon's bank yet? (`pending`,
  `settled`, `failed`)

---

## 3. The big safety idea: two layers + a master switch

Because TrimiT is **already live** with real users, we built this so it can be
released safely **without turning payments on yet**.

### Layer A — Collect & Store (works today)
Salon owners enter their **bank details + KYC** (PAN, business name, address,
etc.). We store it **securely (encrypted)**. This needs **no PayU activation** —
it works the moment you set one secret key. Owners can be onboarded today.

### Layer B — Charge & Split (turned on later)
The actual online payment, the split, refunds, and webhooks. This is hidden
behind a **master switch** called `PAYU_PAYOUTS_ENABLED`.

### The master switch
- `PAYU_PAYOUTS_ENABLED = false` (default) → **nothing charges**. The app
  behaves exactly like today (customers pay at the salon). Old app versions keep
  working.
- `PAYU_PAYOUTS_ENABLED = true` → online payments + auto-split go live.

**Why this matters:** you can ship all this code to production today with zero
risk, because Layer B stays asleep until you flip the switch.

---

## 4. A bug we fixed along the way

The old code tried to save bank details to a database table
(`salon_bank_accounts`) that **was never actually created** — so the feature was
silently broken. It also only saved the **last 4 digits** of the account number,
which is useless for paying anyone.

We fixed this properly:
- Created the real table (via a database migration).
- Now we store the **full** account number and PAN — **encrypted** — so payouts
  can actually work, while keeping the data safe.

---

## 5. How the data is kept safe

- **Encryption at rest:** the full bank account number, PAN, and GSTIN are
  scrambled before being saved, using a secret key (`FIELD_ENCRYPTION_KEY`).
  Even someone looking at the database sees gibberish.
- **Masking in responses:** when the app shows bank info, it only ever shows the
  **last 4 digits** — never the full number or PAN.
- **Owner-only access (RLS):** an owner can only see/edit **their own** salon's
  bank details. Enforced both in code and in the database.
- **No secrets in logs:** card data, PAN, keys, and signatures are never written
  to logs.
- **No card data touches TrimiT:** the customer types their card on **PayU's**
  page, not ours.

---

## 6. The pieces that were built

### Database (one new migration: `database/48_salon_bank_accounts_payu.sql`)
| Table | Purpose |
|---|---|
| `salon_bank_accounts` | one bank+KYC record per salon (encrypted) |
| `payments` | every online payment, with the split breakdown + statuses |
| `refunds` | refund records |
| `payu_webhook_logs` | a tamper-proof log of every PayU event (prevents double-processing) |
| `app_settings` | stores the commission rate (default 5%) |

All money is stored as **integer paise** (e.g. ₹100 = 10000 paise) — never as
decimals — so there are never rounding errors.

### Backend (FastAPI)
| File | What it does |
|---|---|
| `core/crypto.py` | encrypt/decrypt the sensitive fields |
| `core/feature_flags.py` | reads the master switch |
| `services/commission.py` | calculates the 5% / 2% / 93% split exactly |
| `services/payu_service.py` | talks to PayU (signatures, orders, refunds, vendor signup) |
| `routers/payments.py` | the payment endpoints (see below) |
| `routers/bank_accounts.py` | owner saves/reads bank+KYC |
| `routers/admin.py` | admin sets the commission rate |
| `routers/owner_earnings.py` | owner sees earnings + settlement status |

### The payment endpoints
| Endpoint | Plain meaning |
|---|---|
| `POST /payments/create-order` | "Start a payment for this booking" |
| `POST /payments/verify` | PayU tells the browser the result → we confirm the booking |
| `POST /payments/webhook` | PayU tells our server the result (the **trusted** path) |
| `GET /payments/status` | "What's the status of my payment?" |
| `POST /payments/refund` | "Refund this payment" (full or partial) |
| `GET /owner/earnings` | owner's payments + how much has settled |
| `GET/PUT /admin/commission-rate` | admin reads/changes the 5% rate |

### Mobile + Web (customer & owner screens)
- **Owner:** a **Payout Details** screen to enter bank + KYC, showing the ~7%
  breakdown and a **"Payouts: pending activation"** badge until they're approved.
- **Customer:** a **Pay online** button that opens PayU's checkout — but only
  when online payments are switched on. Otherwise it's hidden and customers pay
  at the salon as before.

---

## 7. How a successful payment actually flows

```
Customer taps "Pay online"
        │
        ▼
Backend creates an "order": checks the switch is ON, the salon is approved,
the amount (taken from the booking, never the phone), and the split.
        │
        ▼
Customer is sent to PayU's secure checkout page and pays.
        │
        ├──(browser returns)──► POST /payments/verify  ─┐
        │                                                ├─ both verify a signed
        └──(PayU's server)────► POST /payments/webhook ─┘  hash, then:
                                                            • payment = paid
                                                            • settlement = pending
                                                            • booking = confirmed
        │
        ▼ (a day or two later)
PayU settles the salon's ~93% to their bank ──► webhook ──► settlement = settled
```

Two things make this reliable:
- **The webhook is the trusted source.** Even if the customer closes the browser,
  PayU's server tells us the truth and the booking still gets confirmed.
- **Everything is idempotent.** If the same message arrives twice, we don't
  double-charge, double-confirm, or double-refund.

---

## 8. Correctness guarantees (what can never go wrong)

- The split **always adds up exactly**: salon + commission + PayU fee = total.
- A booking is **only** confirmed after a **verified** successful payment.
- A salon **cannot** receive online payments until it's an **active** PayU vendor.
- Sensitive data is **always encrypted** and **never** shown in full or logged.
- While the switch is OFF, **nothing** in the payment code touches the database
  or PayU — the live app is completely unaffected.

These are backed by **151 automated tests**.

---

## 9. What's intentionally left for later

- **Refund after settlement** (clawing money back from a salon after it's already
  in their bank) — deferred; only pre-settlement refunds are in scope now.
- **GST / tax invoicing** — not handled yet (you're pre-GST at this stage).
- **PayU's exact split & vendor-signup field names** — marked with `TODO(PayU)`
  in `services/payu_service.py`; finalized once PayU activates the split product
  on your account.

---

## 10. Where to look in the code

```
backend/
  database/48_salon_bank_accounts_payu.sql   ← the schema
  core/crypto.py, core/feature_flags.py
  services/commission.py, services/payu_service.py, services/bank_account_service.py
  routers/payments.py, routers/bank_accounts.py, routers/admin.py, routers/owner_earnings.py
  models/payments.py, models/bank_accounts.py
  tests/test_payments_*.py, test_commission.py, test_payu_service.py, ...
mobile/src/   ← owner payout screens + customer payment screens
frontend/src/ ← web equivalents
.kiro/specs/payu-split-payments/  ← requirements.md, design.md, tasks.md
```

For step-by-step setup and testing, see **`PAYU_SETUP_GUIDE.md`**.
