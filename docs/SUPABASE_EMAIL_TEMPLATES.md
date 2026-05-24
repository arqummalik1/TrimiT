# Supabase Email Templates Configuration Guide (TrimiT Brand System)

This guide shows you how to change the Supabase authentication emails from link-based "Magic Links" to **6-digit numeric OTP codes** with a premium, brand-aligned HTML email template.

---

## 1. How to Change from Link to OTP in Supabase

By default, Supabase email templates contain a `<a href="{{ .ConfirmationURL }}">Log In</a>` anchor. To send a 6-digit numeric code instead, you must modify the email templates in your Supabase Dashboard to render `{{ .Token }}` instead of the confirmation link.

### Step-by-Step Dashboard Guide:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** > **Authentication** (or click **Authentication** in the sidebar and go to **Email Templates**).
3. Under the **Email Templates** tab, you will see templates for:
   * **Confirm Signup**
   * **Magic Link** (used for OTP logins)
   * **Reset Password** (used for forgot password)
4. For each of these, replace the default HTML text with the premium templates below.
5. Click **Save** on each template.

---

## 2. Premium Email Templates (HTML)

Copy and paste the HTML below into the respective template body input in the Supabase dashboard.

### Template A: Magic Link (OTP Sign-In)
* **Subject**: `Verify your email for TrimiT` or `Your TrimiT One-Time Password`
* **HTML Body**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TrimiT Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(28, 25, 23, 0.03);">
          
          <!-- Brand Mark Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f5f5f4;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #9a3412; padding: 12px; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 20px; letter-spacing: 1px; font-family: sans-serif;">
                    T
                  </td>
                  <td style="font-family: sans-serif; font-size: 24px; font-weight: 800; color: #1c1917; padding-left: 12px; letter-spacing: -0.5px;">
                    TrimiT
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; color: #44403c; font-size: 15px; line-height: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1c1917; text-align: center;">One-Time Verification Code</h2>
              <p style="margin: 0 0 24px 0; text-align: center; color: #57534e;">Hello, please use the 6-digit code below to sign in to your TrimiT account. This code is valid for 10 minutes.</p>
              
              <!-- OTP Display Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #fff7ed; border: 2px dashed #ea580c; border-radius: 16px; padding: 18px 32px; font-size: 32px; font-weight: bold; color: #9a3412; letter-spacing: 6px; font-family: monospace; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; user-select: all; cursor: pointer;">
                      {{ .Token }}
                    </div>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #a8a29e; font-style: italic; text-align: center;">(Tap code to select & copy)</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; text-align: center; font-size: 13px; color: #78716c;">If you did not request this login code, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px 32px 32px; background-color: #fafaf9; border-top: 1px solid #f5f5f4; color: #a8a29e; font-size: 12px; line-height: 18px;">
              <p style="margin: 0 0 4px 0;">© 2026 TrimiT. All rights reserved.</p>
              <p style="margin: 0;">Premium Salon Appointments & Booking Platform</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Template B: Confirm Signup (Registration Verification)
* **Subject**: `Confirm your signup on TrimiT` or `Your TrimiT Activation Code`
* **HTML Body**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate your TrimiT Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(28, 25, 23, 0.03);">
          
          <!-- Brand Mark Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f5f5f4;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #9a3412; padding: 12px; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 20px; letter-spacing: 1px; font-family: sans-serif;">
                    T
                  </td>
                  <td style="font-family: sans-serif; font-size: 24px; font-weight: 800; color: #1c1917; padding-left: 12px; letter-spacing: -0.5px;">
                    TrimiT
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; color: #44403c; font-size: 15px; line-height: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1c1917; text-align: center;">Welcome to TrimiT!</h2>
              <p style="margin: 0 0 24px 0; text-align: center; color: #57534e;">Thank you for registering. Use the 6-digit confirmation code below to verify your email and activate your account.</p>
              
              <!-- OTP Display Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #fff7ed; border: 2px dashed #ea580c; border-radius: 16px; padding: 18px 32px; font-size: 32px; font-weight: bold; color: #9a3412; letter-spacing: 6px; font-family: monospace; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; user-select: all; cursor: pointer;">
                      {{ .Token }}
                    </div>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #a8a29e; font-style: italic; text-align: center;">(Tap code to select & copy)</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; text-align: center; font-size: 13px; color: #78716c;">If you did not attempt to sign up on our platform, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px 32px 32px; background-color: #fafaf9; border-top: 1px solid #f5f5f4; color: #a8a29e; font-size: 12px; line-height: 18px;">
              <p style="margin: 0 0 4px 0;">© 2026 TrimiT. All rights reserved.</p>
              <p style="margin: 0;">Premium Salon Appointments & Booking Platform</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Template C: Reset Password (Recovery Verification)
* **Subject**: `Reset your TrimiT Password` or `Your TrimiT Reset Code`
* **HTML Body**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(28, 25, 23, 0.03);">
          
          <!-- Brand Mark Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f5f5f4;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #9a3412; padding: 12px; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 20px; letter-spacing: 1px; font-family: sans-serif;">
                    T
                  </td>
                  <td style="font-family: sans-serif; font-size: 24px; font-weight: 800; color: #1c1917; padding-left: 12px; letter-spacing: -0.5px;">
                    TrimiT
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; color: #44403c; font-size: 15px; line-height: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1c1917; text-align: center;">Password Reset Request</h2>
              <p style="margin: 0 0 24px 0; text-align: center; color: #57534e;">We received a request to reset your password. Use the 6-digit code below on the verification screen to reset your credentials.</p>
              
              <!-- OTP Display Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #fff7ed; border: 2px dashed #ea580c; border-radius: 16px; padding: 18px 32px; font-size: 32px; font-weight: bold; color: #9a3412; letter-spacing: 6px; font-family: monospace; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; user-select: all; cursor: pointer;">
                      {{ .Token }}
                    </div>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #a8a29e; font-style: italic; text-align: center;">(Tap code to select & copy)</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; text-align: center; font-size: 13px; color: #78716c;">If you did not request this password reset, please change your password or contact security support immediately.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px 32px 32px; background-color: #fafaf9; border-top: 1px solid #f5f5f4; color: #a8a29e; font-size: 12px; line-height: 18px;">
              <p style="margin: 0 0 4px 0;">© 2026 TrimiT. All rights reserved.</p>
              <p style="margin: 0;">Premium Salon Appointments & Booking Platform</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
