import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { isPublicSalonRead, isProtectedAuthFailure } from '../../src/lib/api';
import { pathRequiresIdempotencyKey } from '../../src/lib/idempotency';

// Mock dependencies
vi.mock('../../src/config/env', () => ({
  getEnv: vi.fn().mockReturnValue('https://test-api.com/api/v1')
}));
vi.mock('../../src/lib/idempotency', () => ({
  pathRequiresIdempotencyKey: vi.fn(),
  createIdempotencyKey: vi.fn().mockReturnValue('test-idempotency-key')
}));
vi.mock('../../src/lib/session', () => ({
  clearPersistedAuth: vi.fn()
}));
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      setSession: vi.fn()
    }
  }
}));

const mockLogout = vi.fn();
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ refreshToken: null, logout: mockLogout }),
    setState: vi.fn()
  }
}));

describe('api.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPublicSalonRead', () => {
    it('returns true for public GET /salons endpoint', () => {
      expect(isPublicSalonRead({ method: 'get', url: '/salons' })).toBe(true);
      expect(isPublicSalonRead({ method: 'GET', url: '/salons?lat=1&lng=2' })).toBe(true);
      expect(isPublicSalonRead({ method: 'get', url: '/salons/123' })).toBe(true);
    });

    it('returns false for non-GET methods or other endpoints', () => {
      expect(isPublicSalonRead({ method: 'post', url: '/salons' })).toBe(false);
      expect(isPublicSalonRead({ method: 'get', url: '/auth/me' })).toBe(false);
      expect(isPublicSalonRead({ method: 'get', url: '/bookings' })).toBe(false);
    });
  });

  describe('interceptors', () => {
    it('removes Authorization header for public salon read', async () => {
      const config = {
        method: 'get',
        url: '/salons',
        headers: {
          Authorization: 'Bearer test-token',
          'X-Custom': 'value'
        }
      };
      
      // Simulate request interceptor
      const interceptor = api.interceptors.request.handlers[0].fulfilled;
      const result = await interceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
      expect(result.headers['X-Custom']).toBe('value');
    });

    it('adds Idempotency-Key for protected POST requests', async () => {
      // Mock pathRequiresIdempotencyKey to return true
      const { pathRequiresIdempotencyKey } = await import('../../src/lib/idempotency');
      vi.mocked(pathRequiresIdempotencyKey).mockReturnValue(true);

      const config = {
        method: 'post',
        url: '/bookings',
        headers: {}
      };
      
      const interceptor = api.interceptors.request.handlers[0].fulfilled;
      const result = await interceptor(config);
      
      expect(result.headers['Idempotency-Key']).toBe('test-idempotency-key');
    });

    it('does not override existing Idempotency-Key', async () => {
      const { pathRequiresIdempotencyKey } = await import('../../src/lib/idempotency');
      vi.mocked(pathRequiresIdempotencyKey).mockReturnValue(true);

      const config = {
        method: 'post',
        url: '/bookings',
        headers: {
          'Idempotency-Key': 'existing-key'
        }
      };
      
      const interceptor = api.interceptors.request.handlers[0].fulfilled;
      const result = await interceptor(config);
      
      expect(result.headers['Idempotency-Key']).toBe('existing-key');
    });
  });

  describe('isProtectedAuthFailure', () => {
    it('is false for 401s from auth credential endpoints', () => {
      const credentialPaths = [
        '/auth/login',
        '/auth/signup',
        '/auth/send-otp',
        '/auth/verify-otp',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/validate-reset-token',
        '/auth/resend-confirmation',
      ];
      credentialPaths.forEach((url) => {
        expect(isProtectedAuthFailure(401, { url })).toBe(false);
      });
    });

    it('is true for 401s from protected endpoints', () => {
      expect(isProtectedAuthFailure(401, { url: '/auth/me' })).toBe(true);
      expect(isProtectedAuthFailure(401, { url: '/auth/complete-profile' })).toBe(true);
      expect(isProtectedAuthFailure(401, { url: '/bookings' })).toBe(true);
      expect(isProtectedAuthFailure(401, { url: '/owner/salon' })).toBe(true);
    });

    it('is false for non-401 statuses', () => {
      expect(isProtectedAuthFailure(403, { url: '/bookings' })).toBe(false);
      expect(isProtectedAuthFailure(500, { url: '/bookings' })).toBe(false);
      expect(isProtectedAuthFailure(undefined, { url: '/bookings' })).toBe(false);
    });
  });

  // A wrong password / wrong OTP in an already-signed-in tab must not destroy
  // the live session — only a 401 on a protected call means the session died.
  describe('401 handling in the response interceptor', () => {
    const rejectInterceptor = () => api.interceptors.response.handlers[0].rejected;

    const unauthorized = (url) => ({
      response: { status: 401, data: {} },
      config: { url, method: 'post', headers: {} },
      message: 'Request failed with status code 401',
    });

    beforeEach(() => {
      delete api.defaults.headers.common.Authorization;
    });

    it('does not clear the session when login credentials are rejected', async () => {
      const { clearPersistedAuth } = await import('../../src/lib/session');
      api.defaults.headers.common.Authorization = 'Bearer live-session-token';

      await expect(rejectInterceptor()(unauthorized('/auth/login'))).rejects.toBeTruthy();

      expect(mockLogout).not.toHaveBeenCalled();
      expect(clearPersistedAuth).not.toHaveBeenCalled();
      expect(api.defaults.headers.common.Authorization).toBe('Bearer live-session-token');
    });

    it('does not clear the session when an OTP is rejected', async () => {
      const { clearPersistedAuth } = await import('../../src/lib/session');
      api.defaults.headers.common.Authorization = 'Bearer live-session-token';

      await expect(rejectInterceptor()(unauthorized('/auth/verify-otp'))).rejects.toBeTruthy();

      expect(mockLogout).not.toHaveBeenCalled();
      expect(clearPersistedAuth).not.toHaveBeenCalled();
      expect(api.defaults.headers.common.Authorization).toBe('Bearer live-session-token');
    });

    it('clears the session when a protected request returns 401', async () => {
      const { clearPersistedAuth } = await import('../../src/lib/session');

      await expect(rejectInterceptor()(unauthorized('/auth/me'))).rejects.toBeTruthy();

      expect(mockLogout).toHaveBeenCalled();
      expect(clearPersistedAuth).toHaveBeenCalled();
      expect(api.defaults.headers.common.Authorization).toBeUndefined();
    });

    it('leaves the session alone on non-401 failures', async () => {
      const { clearPersistedAuth } = await import('../../src/lib/session');
      const error = { response: { status: 500 }, config: { url: '/bookings', headers: {} } };

      await expect(rejectInterceptor()(error)).rejects.toBeTruthy();

      expect(mockLogout).not.toHaveBeenCalled();
      expect(clearPersistedAuth).not.toHaveBeenCalled();
    });
  });
});
