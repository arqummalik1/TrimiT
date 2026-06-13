# Email Service Migration Roadmap
## Moving from Supabase Auth Emails to Dedicated Email Service

> **Current Problem:** Supabase's OTP emails are slow (5-10s), resend not working reliably, using shared SMTP infrastructure.
>
> **Goal:** Fast, reliable OTP delivery (< 2s) with dedicated email service.

---

## Top 3 Recommended Services for TrimiT

### 🏆 1. Resend (RECOMMENDED - Best for India Startups)

**Why Resend:**
- ✅ **3,000 emails/month FREE** (100/day limit)
- ✅ **Excellent DX** - simplest API, clean docs
- ✅ **Fast delivery** - optimized infrastructure
- ✅ **Works in India** - no regional restrictions
- ✅ **Modern** - built for 2024+ (React Email support)

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- All features included

**Pricing after free:**
- Scale tier: $20/mo for 50K emails (when you grow)

**Cons:**
- Daily 100-email cap (fine for early stage)
- Price doubled in Oct 2024 (but still reasonable)

---

### 🥈 2. Amazon SES (Best for Scale)

**Why Amazon SES:**
- ✅ **Cheapest at scale** - $0.10 per 1,000 emails
- ✅ **Unlimited volume**
- ✅ **AWS ecosystem** (if using AWS already)
- ✅ **High reliability**

**Free Tier:**
- 3,000 emails/month FREE (first 12 months if on EC2)
- Then $0.10 per 1,000 emails

**Cons:**
- ❌ Steep learning curve (AWS IAM, regions, etc.)
- ❌ More setup work (DNS, domain verification)
- ❌ Slower delivery than Resend/SendGrid (~158ms avg)
- ❌ Limited dashboard/analytics out of box

---

### 🥉 3. Mailgun (Best Balance)

**Why Mailgun:**
- ✅ **100 emails/day FREE** (permanent)
- ✅ **Developer-friendly** API
- ✅ **Good deliverability**
- ✅ **Built-in analytics**
- ✅ **Faster than SES** (~133ms avg)

**Free Tier:**
- 100 emails/day permanently free (3K/month)

**Pricing after free:**
- Foundation: $35/mo for 50K emails

**Cons:**
- Smaller free tier than Resend
- Owned by Sinch (corporate ownership concerns)

---

## ⚠️ NOT Recommended

### SendGrid
- ❌ **No permanent free tier** (removed in 2025)
- ❌ More expensive than alternatives
- ✅ Good if already using (strong analytics)

### Mailjet
- ❌ Slower support
- ❌ Less modern DX
- ✅ Has 6K/month free tier

---

## 📋 Migration Steps (Resend - Recommended Path)

### Phase 1: Setup Resend (1-2 hours)

#### Step 1: Create Resend Account
1. Go to https://resend.com
2. Sign up with GitHub/Google
3. Verify email
4. Create API key in dashboard

#### Step 2: Verify Domain
1. In Resend dashboard → "Domains"
2. Add `trimit.online`
3. Add DNS records to your domain registrar:
   - **SPF**: TXT record
   - **DKIM**: TXT record  
   - **Return-Path**: CNAME record
4. Wait 5-30 minutes for DNS propagation
5. Click "Verify" in Resend dashboard

#### Step 3: Install Resend SDK (Backend)
```bash
cd backend
pip install resend
```

#### Step 4: Add API Key to Environment
```bash
# backend/.env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

### Phase 2: Update Backend Code (2-3 hours)

#### Step 1: Create Email Service Module
**File:** `backend/services/email_service.py`

```python
"""
Email service using Resend for fast, reliable transactional emails.
Replaces Supabase's slow SMTP for OTP delivery.
"""
import resend
import os
from typing import Optional

resend.api_key = os.getenv("RESEND_API_KEY")

class EmailService:
    @staticmethod
    async def send_otp(email: str, otp_code: str) -> dict:
        """Send OTP email via Resend - typically delivers in < 2s"""
        try:
            params = {
                "from": "TrimiT <noreply@trimit.online>",
                "to": [email],
                "subject": "Your TrimiT Verification Code",
                "html": f"""
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Your Verification Code</h2>
                        <p>Enter this code to continue:</p>
                        <div style="background: #f5f5f5; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 8px; margin: 20px 0;">
                            {otp_code}
                        </div>
                        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                    </div>
                """
            }
            
            email_result = resend.Emails.send(params)
            return {"success": True, "id": email_result.get("id")}
            
        except Exception as e:
            print(f"[EmailService] Resend error: {e}")
            return {"success": False, "error": str(e)}
```

#### Step 2: Update Auth Router
**File:** `backend/routers/auth.py`

```python
# Add import at top
from services.email_service import EmailService

# Replace Supabase OTP send with Resend
@router.post("/send-otp")
async def send_otp_endpoint(request: SendOtpRequest):
    email = request.email.strip().lower()
    
    # Rate limiting check (existing code)
    # ...
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP in database with 10-min expiry (existing logic)
    # ...
    
    # Send via Resend instead of Supabase
    email_result = await EmailService.send_otp(email, otp_code)
    
    if not email_result["success"]:
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please try again."
        )
    
    return {"success": True, "message": "OTP sent"}
```

#### Step 3: Update Signup Flow
**Similar changes to signup endpoint** - send welcome email via Resend instead of Supabase.

---

### Phase 3: Testing (1-2 hours)

#### Test Checklist:

| Test Case | Expected Result |
|-----------|----------------|
| Send OTP (new user) | Email arrives in < 2s |
| Send OTP (existing user) | Email arrives in < 2s |
| Resend OTP (30s cooldown) | Second email arrives |
| Resend OTP (before 30s) | Throttled with error |
| Invalid email | Error returned, no email sent |
| Verify OTP (correct code) | Success |
| Verify OTP (wrong code) | Error |
| OTP expiry (after 10 min) | Expired error |

#### How to Test:
```bash
# 1. Start backend with Resend configured
cd backend
python -m uvicorn main:app --reload

# 2. Test OTP send
curl -X POST http://localhost:8000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'

# 3. Check your inbox (should arrive < 2s)

# 4. Test resend (wait 30s)
curl -X POST http://localhost:8000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
```

---

### Phase 4: Deploy (30 min)

#### Step 1: Add Resend API Key to Render
1. Go to Render dashboard
2. Select your backend service
3. Environment → Add: `RESEND_API_KEY=re_xxxxx`
4. Save (auto-deploys)

#### Step 2: Verify Production
```bash
# Test production endpoint
curl -X POST https://your-backend.onrender.com/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
```

#### Step 3: Monitor
- Check Resend dashboard for delivery stats
- Watch backend logs for errors
- Test with real users

---

### Phase 5: Rollback Plan (if needed)

If Resend fails, you can instantly rollback:

1. Comment out Resend code
2. Uncomment Supabase Auth OTP code
3. Redeploy (5 min)

**Keep Supabase auth code** for first 2 weeks as fallback.

---

## 💰 Cost Comparison (for TrimiT scale)

| Service | Free Tier | After Free | At 10K users/month |
|---------|-----------|------------|-------------------|
| **Supabase** | Unlimited | Included | Included (but slow) |
| **Resend** | 3K/month | $20/mo (50K) | $20/mo |
| **Amazon SES** | 3K/month* | $0.10/1K | $1/month |
| **Mailgun** | 3K/month | $35/mo (50K) | $35/mo |

*First 12 months if on EC2, then $0.10/1K emails

---

## 🎯 Final Recommendation

**Start with Resend:**
1. Easiest setup (2-3 hours total)
2. Best developer experience
3. Free tier covers early growth (3K/month)
4. Fast delivery (< 2s in India)
5. Clean dashboard and analytics
6. When you hit 3K/month, you're making money - $20/mo is nothing

**Switch to Amazon SES later** if:
- You cross 100K emails/month
- You're already on AWS infrastructure
- You have dedicated DevOps team
- Cost optimization becomes critical

---

## 📝 Migration Timeline

| Phase | Time | When |
|-------|------|------|
| Setup Resend account | 30 min | Today |
| Verify domain | 1 hour | Today |
| Update backend code | 2 hours | Today |
| Test thoroughly | 1 hour | Today |
| Deploy to production | 30 min | Today |
| **TOTAL** | **5 hours** | **1 day** |

---

## 🔗 Resources

- [Resend Docs](https://resend.com/docs)
- [Resend Python SDK](https://github.com/resendlabs/resend-python)
- [Email HTML Templates](https://react.email/examples)
- [Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)

---

**Bottom line:** Migrate to Resend today. 5 hours of work solves your email delivery problem permanently. Your OTPs will arrive in < 2 seconds instead of 5-10 seconds.
