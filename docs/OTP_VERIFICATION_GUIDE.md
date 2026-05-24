# Setup & Verification Guide: Numeric Email OTP Overhaul

This guide explains how to local-run, test, and verify the newly implemented 6-digit numeric email OTP flows for **Signup Verification**, **Passwordless Login**, and **Forgot Password / Recovery** across all environments.

---

## 1. Prerequisites & Environment Check

Ensure the following environments are running:

### Backend Local Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and start the Uvicorn dev server:
   ```bash
   venv/bin/uvicorn server:app --port 8001 --reload
   ```
3. Verify the server is running by visiting: [http://localhost:8001/docs](http://localhost:8001/docs)

### Supabase Connection Configuration
The OTP flow leverages Supabase's authentication APIs. Make sure your local or production Supabase keys are configured in your environment files:
* **Backend**: `backend/.env` containing `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
* **Web Client**: `frontend/.env.local` containing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* **Mobile Client**: `mobile/.env` containing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

## 2. Automated Backend Testing

Run the dedicated OTP integration test suite to verify route logic, request schemas, and error formatting.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Execute the test suite with python's module execution (defining `PYTHONPATH` so server modules load correctly):
   ```bash
   PYTHONPATH=. venv/bin/python -m unittest tests/test_otp_flow.py
   ```
3. Alternatively, if using `pytest`:
   ```bash
   PYTHONPATH=. venv/bin/pytest tests/test_otp_flow.py
   ```
4. **Expected Output**: All 3 tests (`test_send_otp_failure_for_unregistered_email`, `test_verify_otp_invalid_code`, `test_forgot_password_otp_trigger`) should complete with `OK` / Passed status.

---

## 3. Web Client (Vite SPA) Testing

### Step 1: Run the Web App
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open the application in your browser at: [http://localhost:5173](http://localhost:5173)

### Step 2: Verification Scenarios

#### Scenario A: Passwordless OTP Login (Magiclink)
1. Go to the Sign In page: `/login`.
2. Enter your email address in the Email input field.
3. Click the **"Sign In with OTP"** button.
4. **Result**: An API call is made to the backend. You should see a success toast and be redirected to: `/verify-otp?email=your_email@example.com&type=magiclink`.
5. Check your inbox (or Supabase inbox if using a local docker stack/Inbucket) for the 6-digit verification code.
6. Enter the 6 digits on the verify page. The system will auto-submit or verify once the digits are filled, logging you in.

#### Scenario B: Forgot Password & Password Reset (Recovery)
1. Go to the Reset Password page: `/forgot-password`.
2. Enter your email address and click **"Send Verification Code"**.
3. **Result**: You should be immediately redirected to: `/verify-otp?email=your_email@example.com&type=recovery`.
4. Enter the 6-digit OTP code received in your email.
5. **Result**: On successful verification, the route automatically navigates to `/reset-password?token=access_token`.
6. Fill in your new password, confirm it, and submit to update your password credentials.

#### Scenario C: Signup Verification (Signup)
1. Go to the Sign Up page: `/signup`.
2. Choose your role, enter your details, accept terms, and click **"Create Account"**.
3. **Result**: If email confirmation is enabled on your Supabase instance, you will be redirected to: `/verify-otp?email=your_email@example.com&type=signup`.
4. Enter your 6-digit OTP code to confirm your registration and automatically log in.

---

## 4. Mobile Client (Expo App) Testing

### Step 1: Run the Mobile App
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Start the Metro Bundler:
   ```bash
   npx expo start
   ```
3. Press `a` to open in Android Emulator, or `i` to open in iOS Simulator.

### Step 2: Verification Scenarios
* **Forgot Password**: Click "Forgot Password" on the Sign In screen, enter your email, press "Send Reset Link", verify you are redirected to the new `VerifyOtp` screen, and enter the mock or actual OTP.
* **OTP Sign-in**: Click "Sign In with OTP" on the Sign In screen, verify redirection to the `VerifyOtp` screen, and verify successful login.

---

## 5. Troubleshooting & Retrieving OTP Codes in Dev

When testing locally, you can retrieve the sent 6-digit OTP codes through:

1. **Supabase Local Docker / Inbucket**:
   If you are running Supabase locally using Docker, emails are intercepted by **Inbucket**. Open [http://localhost:54324](http://localhost:54324) in your browser to inspect the sent email and extract the 6-digit OTP code.
2. **Supabase Cloud Dashboard**:
   If using cloud Supabase, check **Auth -> Logs** or configure a custom SMTP (e.g., Resend, Mailgun) to deliver the emails directly to your inbox.
3. **Mocking/Auto-Confirming**:
   If `AUTH_AUTO_CONFIRM_SIGNUP=True` is enabled in your backend `.env` configuration, signup will auto-confirm and bypass SMTP constraints, logging the user in immediately.
