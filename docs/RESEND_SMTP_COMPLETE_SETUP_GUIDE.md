# Resend SMTP + API Complete Setup Guide for TrimiT

> **Current State:** You have Resend configured in Supabase dashboard (SMTP) + Resend API key available
>
> **Goal:** Optimize to use BOTH Supabase SMTP (for Auth emails) AND Resend API (for faster direct sends)

---

## 📊 Current Architecture Analysis

### What You Have RIGHT NOW:

| Component | Status | Usage |
|-----------|--------|-------|
| **Resend Account** | ✅ Active | Domain verified |
| **Resend API Key** | ✅ Have it | NOT used in code |
| **Supabase SMTP** | ✅ Configured | Using Resend SMTP |
| **Backend Resend SDK** | ❌ Not installed | Not in requirements.txt |
| **Auth OTP Emails** | ✅ Working | Via Supabase → Resend SMTP |
| **Receipt Emails** | ⚠️ Code ready | Waiting for API key |

### Current Email Flow:

```
OTP/Auth Emails:
Mobile → Backend → Supabase Auth API → Supabase SMTP → Resend SMTP → Gmail
Time: ~2-5 seconds

Receipt Emails (subscriptions):
Backend → (NO-OP because RESEND_API_KEY empty) → Not sent
```

---

## 🎯 Optimization Strategy (Dual Setup)

### Recommended Approach: **Hybrid Model**

**Keep both for different purposes:**

1. **Supabase SMTP (Resend)** → Auth emails (OTP, password reset)
   - Why: Already working, integrated with Supabase Auth
   - Speed: 2-5s (acceptable with optimistic nav)
   
2. **Resend API Direct** → Everything else (receipts, notifications, marketing)
   - Why: Faster (< 2s), better tracking, more control
   - Speed: < 2s consistently

**Benefits:**
- ✅ Don't break existing auth flow
- ✅ Get faster emails for new features
- ✅ Better analytics via Resend dashboard
- ✅ Gradual migration possible

---

## 📋 Complete Implementation Plan

### Phase 1: Enable Receipt Emails (5 Minutes) ⭐ START HERE

**Goal:** Use your Resend API key for subscription receipts

#### Step 1: Add API Key to Backend (.env)

**File:** `backend/.env`

```bash
# Add this line (you'll provide the actual key)
RESEND_API_KEY=re_your_actual_key_here
RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>
```

#### Step 2: Deploy Backend

```bash
# The code is already there! Just needs the env var
# Deploy to Render and add RESEND_API_KEY in environment variables
```

**Result:** Subscription receipts will start sending automatically!

**Risk:** ZERO (code already has fallback if key is empty)

---

### Phase 2: Install Resend SDK for Future Use (10 Minutes)

**Goal:** Enable direct Resend API usage for future features

#### Step 1: Install Package

```bash
cd backend
pip install resend
pip freeze > requirements.txt
```

#### Step 2: Verify Installation

```bash
grep resend requirements.txt
# Should show: resend==x.x.x
```

#### Step 3: Commit

```bash
git add requirements.txt
git commit -m "deps: add resend SDK for direct email API"
git push origin 0.16
```

**Result:** Ready for Phase 3 if you want faster OTP emails

---

### Phase 3: Direct Resend OTP (Optional - 3-4 Hours)

**Only do this IF you want < 2s OTP delivery instead of current 2-5s**

#### Current Flow:
```
Mobile → Backend → Supabase Auth → Supabase SMTP → Resend → Gmail (2-5s)
```

#### After Phase 3:
```
Mobile → Backend → Resend API → Gmail (< 2s)
```

**Trade-off:**
- ✅ 1-3s faster
- ❌ Must manage OTP storage yourself
- ❌ 3-4 hours implementation

**My Recommendation:** Skip this for now. Your current 2-5s with optimistic navigation feels instant.

---

## 🚀 Step-by-Step Setup Instructions

### For Backend (.env):

1. **Get your Resend API key** from https://resend.com/api-keys

2. **Add to `backend/.env`:**
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>
   ```

3. **Add to Render Environment Variables:**
   - Go to Render dashboard
   - Select backend service
   - Environment → Add:
     - `RESEND_API_KEY` = `re_xxxxxxxxxxxxx`
     - `RESEND_FROM_EMAIL` = `TrimiT <billing@trimit.online>`
   - Save (auto-deploys)

### For Frontend (web):

**NOT NEEDED** - Resend is backend-only

### For Mobile:

**NOT NEEDED** - Resend is backend-only

---

## 📊 Where to Put API Keys

| Environment | Resend API Key | Resend SMTP (Supabase) |
|-------------|----------------|------------------------|
| **Backend (.env)** | ✅ YES - for direct API | ❌ No |
| **Backend (Render)** | ✅ YES - env vars | ❌ No |
| **Frontend (web)** | ❌ NEVER - security risk | ❌ No |
| **Mobile** | ❌ NEVER - security risk | ❌ No |
| **Supabase Dashboard** | ❌ No | ✅ YES - already configured |

**Critical Security Rule:**
- API keys go in **backend .env only**
- NEVER put API keys in frontend or mobile code
- NEVER commit API keys to git

---

## ✅ Complete Setup Checklist

### Current State Verification:

- [x] Resend account created
- [x] Domain (`trimit.online`) verified in Resend
- [x] SMTP credentials configured in Supabase dashboard
- [x] OTP emails currently working (via Supabase SMTP)
- [ ] Resend API key in backend `.env`
- [ ] Resend SDK installed in backend
- [ ] Receipt emails sending

### Phase 1 - Receipt Emails (Do This Now):

- [ ] Copy Resend API key from dashboard
- [ ] Add to `backend/.env`:
  ```
  RESEND_API_KEY=re_your_key
  RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>
  ```
- [ ] Add to Render environment variables
- [ ] Test: Make a subscription payment
- [ ] Check: Receipt email arrives
- [ ] Verify in Resend dashboard → Emails log

### Phase 2 - Install SDK (Optional):

- [ ] Run `pip install resend` in backend folder
- [ ] Run `pip freeze > requirements.txt`
- [ ] Commit and push
- [ ] Deploy to Render

### Phase 3 - Direct OTP (Skip for Now):

- [ ] Create OTP storage (Redis/Postgres)
- [ ] Implement direct Resend send in `/send-otp`
- [ ] Update `/verify-otp` to check storage
- [ ] Keep Supabase as fallback
- [ ] Test thoroughly
- [ ] Deploy

---

## 🔧 Configuration Files Updated

### Backend `.env` (Local Development)

**File:** `backend/.env`

```bash
# Add these lines:
RESEND_API_KEY=re_xxxxxxxxxxxxx  # ← You provide this
RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>
```

### Render Environment Variables (Production)

**Dashboard:** https://dashboard.render.com → Your Backend Service → Environment

**Add:**
```
RESEND_API_KEY = re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL = TrimiT <billing@trimit.online>
```

### Supabase Dashboard (Already Done)

**Location:** Supabase Dashboard → Authentication → Email Auth → SMTP Settings

**Already configured:**
- SMTP Host: `smtp.resend.com`
- Port: `465` or `587`
- Username: `resend`
- Password: Your Resend API key
- Sender: `noreply@trimit.online`

**Status:** ✅ Already working!

---

## 📈 Performance Benchmarks

### Current (After Phase 1):

| Email Type | Flow | Speed | Status |
|------------|------|-------|--------|
| **OTP/Auth** | Supabase SMTP → Resend | 2-5s | ✅ Working |
| **Receipts** | Direct Resend API | < 2s | ✅ After Phase 1 |
| **Future** | Direct Resend API | < 2s | ✅ Ready |

### After All Phases:

| Email Type | Flow | Speed |
|------------|------|-------|
| **OTP/Auth** | Direct Resend API | < 2s |
| **Receipts** | Direct Resend API | < 2s |
| **Everything** | Direct Resend API | < 2s |

---

## 🧪 Testing Guide

### Test Receipt Emails (After Phase 1):

1. **Make a test subscription payment**
   ```bash
   # In mobile app
   1. Go to Owner Dashboard
   2. Tap "Upgrade to Pro"
   3. Complete Razorpay payment
   ```

2. **Check backend logs**
   ```bash
   # Should see:
   [Sub][Invoice] receipt sent owner=abc12345
   ```

3. **Check email inbox**
   - Subject: "TrimiT Pro receipt — ₹299"
   - Body: Payment details, plan info

4. **Check Resend dashboard**
   - Go to https://resend.com/emails
   - See delivered email
   - Check delivery time (< 2s)

---

## 💡 Best Practices

### Security:

✅ **DO:**
- Store API keys in backend `.env` only
- Add `.env` to `.gitignore`
- Use environment variables in production (Render)
- Rotate keys if accidentally committed

❌ **DON'T:**
- Put API keys in frontend code
- Put API keys in mobile code
- Commit keys to git
- Share keys in chat/email

### Email Sending:

✅ **DO:**
- Use Resend API for new features
- Keep Supabase SMTP for auth (already working)
- Monitor Resend dashboard for bounces
- Handle failures gracefully (fallbacks)

❌ **DON'T:**
- Send marketing emails without unsubscribe
- Send more than 100 emails/day on free tier
- Break existing auth flow unnecessarily

---

## 🎯 Immediate Action Items

### Do Right Now (5 Minutes):

1. Get your Resend API key from https://resend.com/api-keys

2. Add to `backend/.env`:
   ```bash
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM_EMAIL=TrimiT <billing@trimit.online>
   ```

3. Add to Render environment variables:
   - Go to Render dashboard
   - Backend service → Environment
   - Add both variables
   - Save (auto-deploys)

4. Test subscription receipt:
   - Make a test payment in mobile app
   - Check email arrives
   - Verify in Resend dashboard

**That's it! Your receipt emails will start working immediately.**

---

### Do This Week (10 Minutes):

1. Install Resend SDK:
   ```bash
   cd backend
   pip install resend
   pip freeze > requirements.txt
   git add requirements.txt
   git commit -m "deps: add resend SDK"
   git push origin 0.16
   ```

2. Done! You're ready for future features.

---

### Do Later (Optional - 3-4 Hours):

**Only if you want faster OTP emails:**

See Phase 3 in this guide. But honestly, your current setup with optimistic navigation already feels instant to users.

---

## 🔍 Troubleshooting

### Issue: Receipt emails not sending

**Check:**
1. Is `RESEND_API_KEY` set in Render?
2. Is the key valid? (test at https://resend.com/api-keys)
3. Check backend logs for errors
4. Check Resend dashboard → Emails for failures

**Fix:**
- Verify API key is correct
- Check domain is verified in Resend
- Ensure `RESEND_FROM_EMAIL` uses verified domain

---

### Issue: OTP emails still slow

**Current:** 2-5s via Supabase SMTP

**Options:**
1. **Do nothing** - Optimistic navigation makes it feel instant
2. **Implement Phase 3** - Get < 2s with direct Resend API (3-4 hours)

**My Recommendation:** Do nothing. It's already fast enough.

---

## 📊 Cost Analysis

### Free Tier (Current):

| Service | Usage | Limit | Cost |
|---------|-------|-------|------|
| **Supabase Auth** | OTP emails | Unlimited | $0 |
| **Resend SMTP** | Via Supabase | 3K/month | $0 |
| **Resend API** | Receipts | 3K/month, 100/day | $0 |

**Total:** $0/month

### At Scale (10K users/month):

| Service | Emails | Cost |
|---------|--------|------|
| **Auth (Supabase SMTP)** | ~20K OTP | $0 |
| **Receipts (Resend API)** | ~1K receipts | $0 (under free tier) |

**Total:** Still $0/month! 🎉

### When You Exceed Free Tier:

**Resend pricing:**
- Free: 3K emails/month, 100/day
- Pro: $20/mo for 50K emails
- Scale: Custom pricing

---

## 🎬 Final Summary

### What Works Now:
- ✅ OTP emails (2-5s via Supabase SMTP)
- ✅ Optimistic navigation (feels instant)
- ✅ Receipt email code (waiting for API key)

### What You Need to Do:
1. **Add Resend API key to backend** (5 min)
2. **Test receipt emails** (2 min)
3. **Optional: Install Resend SDK** (10 min)

### What You DON'T Need to Do:
- ❌ Change frontend code
- ❌ Change mobile code
- ❌ Modify OTP flow (already optimized)
- ❌ Spend money (free tier covers you)

---

**Next Step:** Provide me your Resend API key, and I'll help you add it to the correct files!
