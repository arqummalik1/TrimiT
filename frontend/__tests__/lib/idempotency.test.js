import { describe, it, expect, vi } from 'vitest';
import { pathRequiresIdempotencyKey, createIdempotencyKey } from '../../src/lib/idempotency';

describe('idempotency', () => {
  describe('pathRequiresIdempotencyKey', () => {
    it('returns true for exact path matches', () => {
      expect(pathRequiresIdempotencyKey('/bookings/')).toBe(true);
      expect(pathRequiresIdempotencyKey('/payments/verify')).toBe(true);
      expect(pathRequiresIdempotencyKey('/subscriptions/verify')).toBe(true);
    });

    it('returns true when URL ends with the path', () => {
      expect(pathRequiresIdempotencyKey('https://api.example.com/api/v1/bookings/')).toBe(true);
      expect(pathRequiresIdempotencyKey('https://api.example.com/api/v1/payments/verify')).toBe(true);
    });

    it('ignores query parameters', () => {
      expect(pathRequiresIdempotencyKey('/bookings/?id=123')).toBe(true);
      expect(pathRequiresIdempotencyKey('/payments/verify?session=abc')).toBe(true);
    });

    it('returns false for non-matching paths', () => {
      expect(pathRequiresIdempotencyKey('/bookings')).toBe(false); // missing trailing slash as per exact match
      expect(pathRequiresIdempotencyKey('/auth/login')).toBe(false);
      expect(pathRequiresIdempotencyKey('/salons')).toBe(false);
    });

    it('handles falsy input', () => {
      expect(pathRequiresIdempotencyKey(null)).toBe(false);
      expect(pathRequiresIdempotencyKey(undefined)).toBe(false);
      expect(pathRequiresIdempotencyKey('')).toBe(false);
    });
  });

  describe('createIdempotencyKey', () => {
    it('returns a string', () => {
      const key = createIdempotencyKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('returns unique keys on subsequent calls', () => {
      const key1 = createIdempotencyKey();
      const key2 = createIdempotencyKey();
      expect(key1).not.toBe(key2);
    });
    
    it('uses fallback if crypto.randomUUID is not available', () => {
      // Mock crypto.randomUUID to be undefined using vitest vi.stubGlobal
      const originalCrypto = global.crypto;
      
      try {
        if (global.crypto) {
          vi.stubGlobal('crypto', { ...global.crypto, randomUUID: undefined });
        } else {
          vi.stubGlobal('crypto', {});
        }
        
        const key = createIdempotencyKey();
        expect(typeof key).toBe('string');
        // Match fallback pattern: Date.now()-randomStr
        expect(key).toMatch(/^\d+-[a-z0-9]+$/);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
