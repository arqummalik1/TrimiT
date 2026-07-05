import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { isPublicSalonRead } from '../../src/lib/api';
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
      signOut: vi.fn()
    }
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
});
