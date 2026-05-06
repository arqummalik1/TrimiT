#!/usr/bin/env python3
"""
Test script to verify salon creation endpoint
"""
import requests
import json

# Test data - same as what mobile app is sending
test_data = {
    "address": "jammu",
    "city": "jammu", 
    "closing_time": "21:00",
    "description": "my description ",
    "images": [],
    "latitude": 28.6139,
    "longitude": 77.209,
    "name": "My salon",
    "opening_time": "09:00", 
    "phone": "7006082958"
}

# You'll need to replace this with a valid token
# Get it from the mobile app logs: [API Client] Auth token set: eyJhbGciOiJFUzI1NiIs...
AUTH_TOKEN = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."  # Replace with actual token

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

print("Testing salon creation endpoint...")
print(f"Data: {json.dumps(test_data, indent=2)}")

try:
    response = requests.post(
        "https://trimit-az5h.onrender.com/api/v1/salons/",
        json=test_data,
        headers=headers,
        timeout=30
    )
    
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200 or response.status_code == 201:
        print("✅ SUCCESS: Salon created!")
    else:
        print("❌ FAILED: Salon creation failed")
        
except Exception as e:
    print(f"❌ ERROR: {e}")