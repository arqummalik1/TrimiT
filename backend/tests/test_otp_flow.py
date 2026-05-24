import requests
import unittest

class TestOtpFlow(unittest.TestCase):
    BASE_URL = "http://localhost:8001/api/v1/auth"

    def test_send_otp_failure_for_unregistered_email(self):
        # Sending OTP to a non-existent email should verify the route executes correctly
        url = f"{self.BASE_URL}/send-otp"
        payload = {"email": "invalid_user_does_not_exist@example.com"}
        
        # Supabase allows sending OTP even to non-existent users by default if configuration permits,
        # but here we expect the router to respond with either 200 or 400 without crashing (500).
        try:
            response = requests.post(url, json=payload, timeout=5)
            print(f"POST /send-otp -> Status: {response.status_code}, Body: {response.text}")
            self.assertIn(response.status_code, [200, 400])
        except Exception as e:
            self.fail(f"POST /send-otp failed with exception: {e}")

    def test_verify_otp_invalid_code(self):
        # Verifying a bogus OTP should return 400 Bad Request
        url = f"{self.BASE_URL}/verify-otp"
        payload = {
            "email": "test@example.com",
            "token": "000000",
            "type": "magiclink"
        }
        try:
            response = requests.post(url, json=payload, timeout=5)
            print(f"POST /verify-otp -> Status: {response.status_code}, Body: {response.text}")
            self.assertEqual(response.status_code, 400)
            data = response.json()
            error_msg = data.get("detail", "")
            if isinstance(data.get("error"), dict):
                error_msg = data["error"].get("message", "")
            self.assertIn("Invalid or expired OTP code", error_msg)
        except Exception as e:
            self.fail(f"POST /verify-otp failed with exception: {e}")

    def test_forgot_password_otp_trigger(self):
        # Forgot password triggers recover. Always returns 200 to prevent email enumeration.
        url = f"{self.BASE_URL}/forgot-password"
        payload = {
            "email": "test@example.com",
            "redirect_to": "trimit://reset-password"
        }
        try:
            response = requests.post(url, json=payload, timeout=5)
            print(f"POST /forgot-password -> Status: {response.status_code}, Body: {response.text}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data.get("message"), "If an account exists, a reset link has been sent")
        except Exception as e:
            self.fail(f"POST /forgot-password failed with exception: {e}")

if __name__ == "__main__":
    unittest.main()
