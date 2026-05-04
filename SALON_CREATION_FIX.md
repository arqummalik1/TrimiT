# Salon Creation Issue - Root Cause Analysis & Fix

## 🔍 Investigation Results

### Backend Status
✅ **Endpoint exists**: `POST /api/v1/salons/`
✅ **Backend deployed**: https://trimit-az5h.onrender.com
✅ **Authentication**: Required (Bearer token)
✅ **Authorization**: Only owners can create salons

### Mobile App Configuration
✅ **API URL**: Correctly set to production
✅ **API_SIGNING_SECRET**: Configured in .env
✅ **Supabase**: Properly configured

---

## 🐛 ROOT CAUSE

The issue is likely one of the following:

### 1. **Request Signature Mismatch** (Most Likely)
The mobile app generates signatures with format:
```
METHOD|PATH|TIMESTAMP
```

But the path might not match what the backend expects:
- Mobile sends: `/api/v1/salons/`
- Backend might expect: `/salons/` (without `/api/v1` prefix)

### 2. **Authentication Token Issues**
- Token might not be set in apiClient
- Token might be expired
- Token format might be incorrect

### 3. **Request Payload Issues**
- Missing required fields
- Incorrect data types
- Validation errors

---

## 🔧 FIXES TO IMPLEMENT

### Fix 1: Update API Client Path Handling

**File**: `mobile/src/services/apiClient.ts`

**Problem**: The signature is generated with the full path including `/api/v1`, but the backend middleware might only see the route path without the prefix.

**Solution**: Ensure the path used for signature matches what the backend sees.

```typescript
// In apiClient.ts interceptor
if (isMutating && config.url) {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Extract the path that the backend will see
    let path = config.url;
    
    // If it's a relative URL, it will be appended to baseURL
    // Backend sees the path after baseURL
    if (!path.startsWith('http')) {
      // Remove /api/v1 prefix if present since backend routes already have it
      path = path.replace(/^\/api\/v1/, '');
      path = path.startsWith('/') ? path : `/${path}`;
    }
    
    const signature = await generateRequestSignature(
      config.method || 'POST',
      path,
      config.data,
      timestamp
    );
    
    if (signature) {
      config.headers['X-Trimit-Timestamp'] = timestamp;
      config.headers['X-Trimit-Signature'] = signature;
    }
  } catch (err) {
    console.warn('[API] Signature failed:', err);
  }
}
```

### Fix 2: Add Detailed Error Logging

**File**: `mobile/src/services/salonService.ts`

```typescript
createSalon: async (salonData: any): Promise<Salon> => {
  try {
    console.log('[SalonService] Creating salon with data:', {
      ...salonData,
      // Don't log sensitive data
    });
    
    const response = await apiClient.post(`${API_V1_PREFIX}/salons/`, salonData);
    
    console.log('[SalonService] Salon created successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[SalonService] Create salon failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    throw error;
  }
},
```

### Fix 3: Verify Authentication Token

**File**: `mobile/src/screens/owner/ManageSalonScreen.tsx`

Add token verification before submission:

```typescript
const handleSubmit = async () => {
  if (!formData.name || !formData.address || !formData.city || !formData.phone) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  // Verify we have auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    showToast('Authentication required. Please log in again.', 'error');
    navigation.navigate('Auth', { screen: 'Login' });
    return;
  }

  const payload = {
    ...formData,
    latitude: parseFloat(formData.latitude),
    longitude: parseFloat(formData.longitude),
  };

  if (salon) {
    updateMutation.mutate(payload);
  } else {
    createMutation.mutate(payload);
  }
};
```

### Fix 4: Make API_SIGNING_SECRET Optional in Backend

The backend already handles this, but let's verify it's working correctly.

**File**: `backend/core/middleware.py` (already fixed)

---

## 🧪 TESTING PLAN

### Test 1: Direct API Call
```bash
# Get auth token first
curl -X POST https://trimit-az5h.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@test.com", "password": "password123"}'

# Use the token to create salon
curl -X POST https://trimit-az5h.onrender.com/api/v1/salons/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Salon",
    "description": "A test salon",
    "address": "123 Test Street",
    "city": "Test City",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "phone": "+91 9876543210",
    "opening_time": "09:00",
    "closing_time": "21:00",
    "images": []
  }'
```

### Test 2: Mobile App with Logging
1. Add all logging fixes
2. Run app in development mode
3. Attempt to create salon
4. Check console for detailed error
5. Check Render logs for backend error

### Test 3: Signature Verification
1. Log the signature being generated
2. Log the path being used
3. Compare with backend expectations
4. Adjust if needed

---

## 📝 IMPLEMENTATION CHECKLIST

- [ ] Update apiClient.ts path handling for signatures
- [ ] Add detailed logging to salonService.ts
- [ ] Add token verification in ManageSalonScreen.tsx
- [ ] Test with curl to verify backend works
- [ ] Test in mobile app with logging
- [ ] Fix any discovered issues
- [ ] Remove debug logging after fix
- [ ] Document the solution

---

## 🎯 EXPECTED OUTCOME

After implementing these fixes:
1. Salon creation will work successfully
2. Clear error messages if something fails
3. Better debugging capability for future issues
4. Proper authentication handling

---

**Status**: Ready to implement
**Priority**: CRITICAL
**ETA**: 1-2 hours
