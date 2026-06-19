/**
 * Unit tests for src/lib/idempotency.ts
 * Covers: pathRequiresIdempotencyKey
 */
import { pathRequiresIdempotencyKey } from '../../src/lib/idempotency';

describe('pathRequiresIdempotencyKey', () => {
  it('returns true for /bookings/ path', () => {
    expect(pathRequiresIdempotencyKey('/bookings/')).toBe(true);
  });

  it('returns true for /bookings path (matches endswith)', () => {
    expect(pathRequiresIdempotencyKey('/bookings')).toBe(true);
  });

  it('returns true for /payments/verify path', () => {
    expect(pathRequiresIdempotencyKey('/payments/verify')).toBe(true);
  });

  it('returns true for URL with query params', () => {
    expect(pathRequiresIdempotencyKey('/bookings/? salon_id=123')).toBe(true);
  });

  it('returns false for unrelated paths', () => {
    expect(pathRequiresIdempotencyKey('/auth/login')).toBe(false);
    expect(pathRequiresIdempotencyKey('/salons/')).toBe(false);
    expect(pathRequiresIdempotencyKey('/services/')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(pathRequiresIdempotencyKey(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pathRequiresIdempotencyKey('')).toBe(false);
  });

  it('returns false for partial match that is not endswith', () => {
    expect(pathRequiresIdempotencyKey('/bookings-other/')).toBe(false);
  });
});
