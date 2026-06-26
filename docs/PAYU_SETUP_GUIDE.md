# TrimiT — PayU Split Payments: Setup, Deploy & Test Guide

> **Audience:** beginners. Follow these steps in order. Each step says exactly
> what to click/type and how to know it worked.
>
> Companion doc: **`PAYU_PAYMENTS_IMPLEMENTATION.md`** (what was built and why).

---

## 0. Before you start — what you need

- Access to the **Render** dashboard (backend hosting)
- Access to the **Supabase** dashboard (database)
- Access to the **Vercel** dashboard (web hosting) — usually auto-deploys
- Your **PayU TEST** credentials: a **test merchant key** and **test salt**
- (Later, for go-live) your **PayU LIVE** key + salt

> 💡 The whole payment system ships **switched OFF**. Following this guide does
> **not** charge any real customer until you explicitly flip the switch in the
> final section.

---

## 1. The encryption key (most important)

Saving bank details requires a secret key called **`FIELD_ENCRYPTION_KEY`**.
Without it, saving bank info will fail on purpose (a safety feature).

Your generated key (already placed in `backend/.env`):

```
FIELD_ENCRYPTION_KEY=gYzs3t4nhwUKSvrLFnebTv-IxMYGJuHAYCqsAKBmCVs=
```

> ⚠️ **Keep this safe.** Use the **same key** everywhere (local + Render). If you
> ever change or lose it, previously saved bank data can no longer be decrypted.

**Need a fresh one?** Run this in `backend/`:
```bash
./venv/bin/python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 2. Set environment variables on Render

1. Open **Render → your backend service → Environment** tab.
2. Add these (click **Add Environment Variable** for each):

| Key | Value | Notes |
|---|---|---|
| `FIELD_ENCRYPTION_KEY` | `gYzs3t4nhwUKSvrLFnebTv-IxMYGJuHAYCqsAKBmCVs=` | same as local |
| `PAYU_PAYOUTS_ENABLED` | `false` | keep OFF for now |
| `PAYU_MODE` | `test` | use PayU sandbox |
| `PAYU_TEST_MERCHANT_KEY` | *(your PayU test key)* | from PayU dashboard |
| `PAYU_TEST_MERCHANT_SALT` | *(your PayU test salt)* | from PayU dashboard |
| `PLATFORM_COMMISSION_PERCENT` | `5.0` | optional (default is 5) |
| `PAYU_FEE_PERCENT` | `2.0` | optional (default is 2) |

3. Click **Save Changes**. Render redeploys automatically (1–3 minutes).

> Leave `PAYU_MERCHANT_KEY` / `PAYU_MERCHANT_SALT` (the LIVE ones) empty until
> go-live.

---

## 3. Confirm the database migration (already applied ✅)

You already ran `database/48_salon_bank_accounts_payu.sql` in the Supabase SQL
Editor — **no need to run it again.**

To double-check it's there:
1. Open **Supabase → Table Editor**.
2. Confirm these 5 tables exist:
   - `salon_bank_accounts`
   - `payments`
   - `refunds`
   - `payu_webhook_logs`
   - `app_settings`
3. Open `app_settings` → you should see one row: `commission_percent = 5`.

> If any table is missing, open the SQL Editor and run the contents of
> `database/48_salon_bank_accounts_payu.sql` once. It is safe to re-run
> (it uses `IF NOT EXISTS`).

---

## 4. Deploy backend + web

1. Merge your working branch into `main` and push:
   ```bash
   git checkout main
   git merge zero-point-ten
   git push origin main
   ```
   (Also push `zero-point-ten` if you keep it in sync.)
2. **Render** (backend) and **Vercel** (web) auto-deploy from `main`.
3. Wait for both to finish (watch their dashboards).

---

## 5. Verify the backend is healthy

Run (replace with your real backend URL):
```bash
curl https://trimit-az5h.onrender.com/health
```
✅ You should get a healthy response (HTTP 200). If not, check Render logs.

---

## 6. Verify Phase 1 — owners can save bank details (LIVE TODAY)

This is the part that goes live now. Test it as a **salon owner**.

1. Open the app (or web) and log in as an **owner**.
2. Go to **Payout Details** (in onboarding or Settings).
3. You should see:
   - a note: **"~7% total deducted (5% TrimiT + 2% gateway), you receive ~93%"**
   - a badge: **"Payouts: pending activation"**
4. Fill in: account holder name, account number, IFSC, PAN, business name,
   phone, email, address, pincode (GSTIN optional). Tap **Save**.
5. ✅ Success message = it worked.

**Confirm it's stored safely (Supabase → `salon_bank_accounts`):**
- `account_number_enc` and `pan_enc` look like **random scrambled text**
  (encrypted) — *not* the real number. ✅
- `account_number_last4` shows the last 4 digits.
- `vendor_status` = `not_registered`.

> ❌ If saving fails with a server error, `FIELD_ENCRYPTION_KEY` is probably not
> set on Render. Re-check Step 2.

---

## 7. Test Phase 2 — online payment in PayU TEST mode (before go-live)

This stays invisible to real users. Do it on a test setup or a quiet window.

**7.1 — Turn the switch on (test mode):**
On Render set:
- `PAYU_PAYOUTS_ENABLED=true`
- `PAYU_MODE=test`
- `PAYU_TEST_MERCHANT_KEY` / `PAYU_TEST_MERCHANT_SALT` filled in

**7.2 — Make one test salon "active":**
Real vendor approval needs PayU's split product live, so for testing we set it
manually. In **Supabase → SQL Editor**:
```sql
UPDATE salon_bank_accounts
SET vendor_status = 'active', payu_vendor_id = 'test_vendor'
WHERE salon_id = '<your-test-salon-id>';
```

**7.3 — Pay as a customer:**
1. As a customer, book a service at that test salon.
2. Tap **Pay online** → you're taken to PayU's **test checkout** page.
3. Pay using a **PayU test card** (from PayU's test documentation).

**7.4 — Check the results:**

| Check | Where | Expected |
|---|---|---|
| Payment recorded | `payments` table | `payment_status = paid`, `settlement_status = pending` |
| Split adds up | `payments` row | `commission_paise + payu_fee_paise + vendor_paise = amount_paise` |
| Booking confirmed | `bookings` table | `status = confirmed` |
| Event logged | `payu_webhook_logs` | a row with `outcome = success` |
| Owner earnings | `GET /api/v1/owner/earnings` | payment shows under **pending settlement** (not settled) |

**7.5 — Turn the switch back OFF after testing:**
On Render set `PAYU_PAYOUTS_ENABLED=false` again.

---

## 8. Run the automated tests (optional, local)

From the `backend/` folder:
```bash
./venv/bin/python -m pytest \
  tests/test_payments_create_order.py \
  tests/test_payments_verify.py \
  tests/test_payments_webhook.py \
  tests/test_payments_refund.py \
  tests/test_payments_status.py \
  tests/test_commission.py \
  tests/test_payu_service.py \
  tests/test_bank_accounts.py \
  tests/test_vendor_registration.py \
  tests/test_admin_commission.py \
  tests/test_owner_earnings.py \
  tests/test_crypto.py \
  tests/test_payments_flag_off_regression.py -q
```
✅ Expected: **all pass** (the full PayU set is 151 tests).

Quick "does the app start" check:
```bash
./venv/bin/python -c "import server; print('OK')"
```

---

## 9. Mobile release (so phone users see the new screens)

Backend and web deploy automatically, but the **mobile** owner-payout and
customer-payment screens only reach users via a **new app build**:

```bash
cd mobile
npm run build:aab:local      # production build → upload to Google Play Console
# or for internal testing:
npm run build:apk:local
```

---

## 10. Go-live checklist (do this LATER, when PayU split is approved)

Only when PayU has activated the **split settlement** product on your account:

- [ ] Real owners have filled Payout Details and show `vendor_status = active`
- [ ] Set `PAYU_MODE = live` and fill `PAYU_MERCHANT_KEY` / `PAYU_MERCHANT_SALT`
- [ ] Do one small **real** test transaction end-to-end
- [ ] Set `PAYU_PAYOUTS_ENABLED = true` on Render
- [ ] Set the client flag `ENABLE_ONLINE_PAY = true` and ship a new mobile build
- [ ] Watch `payu_webhook_logs` and `payments` for the first live payments
- [ ] Confirm a salon's settlement reaches their bank (`settlement_status = settled`)

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Saving bank details errors out | `FIELD_ENCRYPTION_KEY` not set on Render | add it (Step 2) and redeploy |
| "Online payments unavailable" on Pay online | switch is OFF (expected) | set `PAYU_PAYOUTS_ENABLED=true` to test |
| Pay online button doesn't appear | client flag `ENABLE_ONLINE_PAY` is off | enable it + new mobile build |
| Payment paid but salon not active error | `vendor_status` not `active` | salon must complete payout onboarding / be approved |
| Webhook events not recorded | wrong PayU webhook URL | point PayU webhook to `https://YOUR-BACKEND/api/v1/payments/webhook` |
| Bank tables missing in Supabase | migration not applied | run `database/48_salon_bank_accounts_payu.sql` once |

---

## 12. Quick reference — environment variables

| Variable | Purpose | Today's value |
|---|---|---|
| `FIELD_ENCRYPTION_KEY` | encrypts bank/KYC | the generated key (set everywhere) |
| `PAYU_PAYOUTS_ENABLED` | master switch | `false` |
| `PAYU_MODE` | test vs live | `test` |
| `PAYU_TEST_MERCHANT_KEY` / `_SALT` | PayU sandbox creds | your test creds |
| `PAYU_MERCHANT_KEY` / `_SALT` | PayU live creds | empty until go-live |
| `PLATFORM_COMMISSION_PERCENT` | TrimiT's cut | `5.0` |
| `PAYU_FEE_PERCENT` | gateway fee (for disclosure/split) | `2.0` |

---

**Summary:** Today you can safely deploy and let owners enter bank details
(Phase 1). Online charging (Phase 2) stays off behind a switch until you test it
in PayU test mode and PayU approves your split product. Nothing here can affect
existing live users while `PAYU_PAYOUTS_ENABLED` is `false`.
