# Promo system — two lanes

> **Full guide:** See `DEVELOPER_GUIDE.md` for salon/parlor, admin access, file map, and gaps.

## Lane A — Salon promos (owner-funded)

- Owners create codes in **Settings → Promo Codes** (mobile).
- Codes are **salon-scoped only** — work at that salon's checkout.
- Customer sees **Offers from [Salon]** on booking; tap to apply (Zomato-style).
- Best single discount wins vs menu service offer (not stacked).

## Lane B — Platform campaigns (TrimiT-funded)

- Welcome offer **TRIMIT50**: flat **₹50 off**, min order **₹149**, **10 days**, first booking.
- Issued automatically when a **customer** completes profile with a **unique mobile**.
- Bound to `user_id` + `phone_e164` — one welcome per phone ever.
- Auto-applies at checkout when eligible; also in **Profile → My offers**.
- Welcome modal on first Discover visit after signup.

## Admin (`/admin` → Campaigns)

- Toggle welcome campaign on/off.
- Edit amount, min order, validity days.
- **Salon participation**: all salons by default; exclude specific salons.
- **Include all salons** clears exclusions.

## Migrations (apply in order in Supabase SQL Editor)

1. `database/59_salon_promo_hardening.sql`
2. `database/60_customer_phone_unique.sql`
3. `database/61_platform_campaigns.sql`

## Existing customers (manual)

For the 2 onboarded customers without phone, run in SQL Editor:

```sql
UPDATE public.users
SET phone = '+91XXXXXXXXXX'
WHERE id = '<user-uuid>' AND role = 'customer';
```

Then issue grant manually if needed:

```sql
INSERT INTO campaign_grants (campaign_id, user_id, phone_e164, code, expires_at)
SELECT id, '<user-uuid>', '+91XXXXXXXXXX', code, NOW() + INTERVAL '10 days'
FROM platform_campaigns WHERE code = 'TRIMIT50'
ON CONFLICT DO NOTHING;
```

## Settlement

Bookings with platform promo store `promo_code` + `discount_amount`. Track monthly per salon for TrimiT reimbursement offline.
