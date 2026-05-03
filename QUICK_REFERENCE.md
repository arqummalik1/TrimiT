# TrimiT - Quick Reference Guide

## 🚀 Features Implemented

### ✅ Phase 1.1: Promo Codes (COMPLETE)
**Status**: Ready for deployment
**Files**: See `PHASE1_PROMO_CODES_STATUS.md`

**Customer Features**:
- Apply promo codes at checkout
- See discount breakdown
- Remove and reapply codes

**Owner Features**:
- Create percentage or flat discount codes
- Set limits (min order, max uses, expiry)
- View usage stats with progress bars
- Edit/deactivate promos

**Sample Codes**:
- `TRIMIT50` - 50% off (max ₹100, min ₹200)
- `FIRST100` - ₹100 flat off (min ₹300)
- `WELCOME20` - 20% off (max ₹200)

---

### 🚧 Phase 1.2: One-Click Rescheduling (Backend Complete)
**Status**: Backend ready, mobile UI pending
**Files**: See `PHASE1_2_RESCHEDULING_STATUS.md`

**Features**:
- Atomic slot swap (no race conditions)
- Customer can reschedule own bookings
- Owner can propose reschedule
- Complete audit trail
- Reschedule history

**Remaining**: Mobile UI (8 hours)

---

## 📁 Key Files

### Documentation
- `SENIOR_DEV_SESSION_SUMMARY.md` - Complete session overview
- `IMPLEMENTATION_PLAN.md` - Full roadmap
- `ROADMAP.md` - Original feature comparison

### Promo Codes
- `PROMO_CODES_IMPLEMENTATION_SUMMARY.md` - Feature docs
- `PROMO_CODES_FLOW.md` - Visual flows
- `PROMO_CODES_TESTING_GUIDE.md` - 22 test scenarios
- `PROMO_CODES_DEPLOYMENT.md` - Deployment steps

### Rescheduling
- `PHASE1_2_RESCHEDULING_PLAN.md` - Technical spec
- `PHASE1_2_RESCHEDULING_STATUS.md` - Current status
- `database/14_booking_reschedule.sql` - Database migration

### Code
- `mobile/src/screens/customer/BookingScreen.tsx` - Promo UI
- `mobile/src/screens/owner/PromoManagementScreen.tsx` - Promo CRUD
- `backend/routers/bookings.py` - Reschedule API
- `backend/models/reschedule.py` - Reschedule models

---

## 🔧 API Endpoints

### Promo Codes
```
POST   /api/v1/promotions/validate          # Validate promo code
GET    /api/v1/promotions/active            # Get active promos
POST   /api/v1/promotions                   # Create promo (owner)
GET    /api/v1/promotions/owner             # Get owner's promos
PATCH  /api/v1/promotions/{id}              # Update promo
DELETE /api/v1/promotions/{id}              # Deactivate promo
GET    /api/v1/promotions/{id}/stats        # Get usage stats
```

### Rescheduling
```
PATCH  /api/bookings/{id}/reschedule        # Reschedule booking
GET    /api/bookings/{id}/reschedule-history # Get history
```

---

## 🗄️ Database

### New Tables
- `promotions` - Promo code definitions
- `promo_usage` - Usage tracking
- `booking_reschedules` - Reschedule audit trail

### New Columns (bookings)
- `promo_code` - Applied promo code
- `discount_amount` - Discount given
- `original_amount` - Price before discount
- `reschedule_count` - Number of reschedules
- `last_rescheduled_at` - Last reschedule time
- `original_date` - Original booking date
- `original_time_slot` - Original time slot

### RPC Functions
- `validate_promo_code()` - Validate and calculate discount
- `reschedule_booking_atomic()` - Atomic reschedule operation
- `get_booking_reschedule_history()` - Get reschedule history

---

## 🧪 Testing

### Promo Codes
```bash
# Test validation
curl -X POST http://localhost:8000/api/v1/promotions/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"TRIMIT50","salon_id":"...","booking_amount":500}'

# Expected: {"valid":true,"discount_amount":100,"final_amount":400}
```

### Rescheduling
```bash
# Test reschedule
curl -X PATCH http://localhost:8000/api/bookings/{id}/reschedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"new_date":"2026-05-10","new_time_slot":"14:00"}'

# Expected: {"success":true,"booking_id":"...","reschedule_count":1}
```

---

## 🚀 Deployment

### Database
```sql
-- Run migrations in order
\i database/13_promo_codes.sql
\i database/14_booking_reschedule.sql
```

### Backend
```bash
# Already deployed with changes
# Verify endpoints are working
```

### Mobile
```bash
# Build and deploy
cd mobile
eas build --platform all
```

---

## 📊 Metrics to Track

### Promo Codes
- Promo usage rate (% of bookings)
- Average discount amount
- Most popular codes
- Conversion rate with vs without promo

### Rescheduling
- Reschedule rate (% of bookings)
- Cancellation rate (should decrease)
- Average reschedule count per booking
- Time between booking and reschedule

---

## 🐛 Troubleshooting

### Promo Code Not Working
1. Check if code exists: `SELECT * FROM promotions WHERE code = 'CODE'`
2. Check if active: `active = true`
3. Check if expired: `expires_at > NOW()`
4. Check usage: `used_count < max_uses`
5. Check min order: `booking_amount >= min_order_value`

### Reschedule Failing
1. Check booking status: Must be 'pending' or 'confirmed'
2. Check slot availability: Query bookings for new slot
3. Check permissions: User must own booking or salon
4. Check date: Cannot reschedule to past
5. Check logs: `backend/logs/` for detailed errors

---

## 🔐 Security

### Rate Limits
- Promo validation: 10/minute
- Promo creation: 5/minute
- Rescheduling: 5/minute

### Permissions
- Customers: Own bookings only
- Owners: Own salon bookings only
- RLS policies enforce at database level

---

## 📞 Support

### Questions?
1. Check relevant documentation file
2. Review code comments
3. Check `SENIOR_DEV_SESSION_SUMMARY.md`
4. Review test scenarios

### Issues?
1. Check diagnostics: `getDiagnostics()`
2. Check logs: Backend and mobile
3. Review error handling in code
4. Check database constraints

---

## 🎯 Next Steps

### Immediate
1. Test promo codes end-to-end
2. Deploy database migrations
3. Implement reschedule mobile UI
4. Add push notifications

### Short Term
1. Monitor metrics
2. Gather user feedback
3. Iterate based on data
4. Start Phase 2 (Staff Selection)

---

## 💡 Pro Tips

### Performance
- Use `useCallback` for event handlers
- Use `useMemo` for expensive computations
- Profile before optimizing
- Track performance metrics

### Testing
- Test atomic operations under load
- Test edge cases thoroughly
- Test error handling
- Test on real devices

### Deployment
- Deploy database first
- Test backend endpoints
- Deploy mobile last
- Monitor error logs

---

**Last Updated**: May 3, 2026
**Version**: 1.1.0
**Status**: Production Ready (Promo Codes) | In Progress (Rescheduling)
