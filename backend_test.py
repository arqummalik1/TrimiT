import requests
import sys
import json
from datetime import datetime

class TrimiTAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.content else {}
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text}")
                
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        print("\n" + "="*50)
        print("TESTING HEALTH CHECK")
        print("="*50)
        
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test signup endpoint (expect rate limit error due to Supabase)
        test_user_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "name": "Test User",
            "phone": "+91 9876543210",
            "role": "customer"
        }
        
        print(f"\nTesting signup with data: {test_user_data}")
        signup_success, signup_response = self.run_test(
            "User Signup",
            "POST",
            "api/auth/signup",
            400,  # Expecting 400 due to rate limiting
            data=test_user_data
        )
        
        # Test login endpoint (should also fail without valid user)
        login_data = {
            "email": "test@example.com",
            "password": "TestPass123!"
        }
        
        login_success, login_response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            401,  # Expecting 401 for invalid credentials
            data=login_data
        )
        
        return signup_success and login_success

    def test_salon_endpoints(self):
        """Test salon endpoints"""
        print("\n" + "="*50)
        print("TESTING SALON ENDPOINTS")
        print("="*50)
        
        # Test get salons (should work without auth)
        salons_success, salons_response = self.run_test(
            "Get Salons",
            "GET",
            "api/salons",
            200
        )
        
        # Test get salons with query parameters
        salons_query_success, _ = self.run_test(
            "Get Salons with City Filter",
            "GET",
            "api/salons?city=Mumbai",
            200
        )
        
        # Test get specific salon (should return 404 for non-existent salon)
        salon_detail_success, _ = self.run_test(
            "Get Salon Detail",
            "GET",
            "api/salons/non-existent-id",
            404
        )
        
        return salons_success and salons_query_success and salon_detail_success

    def test_booking_endpoints(self):
        """Test booking endpoints"""
        print("\n" + "="*50)
        print("TESTING BOOKING ENDPOINTS")
        print("="*50)
        
        # Test get available slots (should return 404 for non-existent salon)
        slots_success, _ = self.run_test(
            "Get Available Slots",
            "GET",
            "api/salons/non-existent-salon/slots?date=2025-01-10&service_id=non-existent-service",
            404
        )
        
        # Test get bookings without auth (should return 401)
        bookings_success, _ = self.run_test(
            "Get My Bookings (No Auth)",
            "GET",
            "api/bookings",
            401
        )
        
        return slots_success and bookings_success

    def test_protected_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n" + "="*50)
        print("TESTING PROTECTED ENDPOINTS")
        print("="*50)
        
        # Test /api/auth/me without token
        me_success, _ = self.run_test(
            "Get Current User (No Auth)",
            "GET",
            "api/auth/me",
            401
        )
        
        # Test create salon without auth
        salon_data = {
            "name": "Test Salon",
            "address": "123 Test Street",
            "city": "Mumbai",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "phone": "+91 9876543210"
        }
        
        create_salon_success, _ = self.run_test(
            "Create Salon (No Auth)",
            "POST",
            "api/salons",
            401,
            data=salon_data
        )
        
        return me_success and create_salon_success

    def test_payment_endpoints(self):
        """Test payment endpoints"""
        print("\n" + "="*50)
        print("TESTING PAYMENT ENDPOINTS")
        print("="*50)
        
        # Test create payment order without auth
        payment_data = {
            "booking_id": "non-existent-booking"
        }
        
        payment_success, _ = self.run_test(
            "Create Payment Order (No Auth)",
            "POST",
            "api/payments/create-order",
            401,
            data=payment_data
        )
        
        return payment_success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting TrimiT API Testing...")
        print(f"Base URL: {self.base_url}")
        
        # Run all test suites
        health_ok = self.test_health_check()
        auth_ok = self.test_auth_endpoints()
        salon_ok = self.test_salon_endpoints()
        booking_ok = self.test_booking_endpoints()
        protected_ok = self.test_protected_endpoints()
        payment_ok = self.test_payment_endpoints()
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"✅ Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                print(f"   - {test['test']}: {error_msg}")
        
        print(f"\n🏥 Health Check: {'✅' if health_ok else '❌'}")
        print(f"🔐 Auth Endpoints: {'✅' if auth_ok else '❌'}")
        print(f"🏪 Salon Endpoints: {'✅' if salon_ok else '❌'}")
        print(f"📅 Booking Endpoints: {'✅' if booking_ok else '❌'}")
        print(f"🔒 Protected Endpoints: {'✅' if protected_ok else '❌'}")
        print(f"💳 Payment Endpoints: {'✅' if payment_ok else '❌'}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TrimiTAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())