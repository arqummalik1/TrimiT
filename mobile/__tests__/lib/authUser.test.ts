/**
 * Unit tests for src/lib/authUser.ts
 * Covers: normalizeAuthUser
 */
import { normalizeAuthUser } from '../../src/lib/authUser';

describe('normalizeAuthUser', () => {
  it('returns null for null input', () => {
    expect(normalizeAuthUser(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeAuthUser(undefined)).toBeNull();
  });

  it('returns null when object has no id and no profile', () => {
    expect(normalizeAuthUser({ email: 'a@b.com' })).toBeNull();
  });

  it('normalizes a raw user object with id', () => {
    const raw = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      phone: '9876543210',
      role: 'customer',
      created_at: '2025-01-01T00:00:00Z',
    };
    const result = normalizeAuthUser(raw);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('user-1');
    expect(result!.email).toBe('test@example.com');
    expect(result!.name).toBe('Test User');
    expect(result!.role).toBe('customer');
  });

  it('extracts profile from nested profile object', () => {
    const raw = {
      profile: {
        id: 'user-2',
        email: 'nested@example.com',
        name: 'Nested User',
        role: 'owner',
        created_at: '2025-06-01',
      },
    };
    const result = normalizeAuthUser(raw);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('user-2');
    expect(result!.role).toBe('owner');
  });

  it('defaults email and name to empty strings when missing', () => {
    const result = normalizeAuthUser({ id: 'u1' });
    expect(result!.email).toBe('');
    expect(result!.name).toBe('');
  });

  it('defaults created_at to empty string when missing', () => {
    const result = normalizeAuthUser({ id: 'u1' });
    expect(result!.created_at).toBe('');
  });

  it('maps "owner" role correctly', () => {
    const result = normalizeAuthUser({ id: 'u1', role: 'owner' });
    expect(result!.role).toBe('owner');
  });

  it('maps any non-owner role to "customer"', () => {
    const result = normalizeAuthUser({ id: 'u1', role: 'admin' });
    expect(result!.role).toBe('customer');
  });

  it('maps undefined role to "customer"', () => {
    const result = normalizeAuthUser({ id: 'u1' });
    expect(result!.role).toBe('customer');
  });

  it('preserves optional notification preferences', () => {
    const raw = {
      id: 'u1',
      push_token: 'tok-123',
      push_enabled: true,
      notify_bookings: true,
      notify_booking_updates: false,
      notify_promotional: true,
      notify_reminders: false,
    };
    const result = normalizeAuthUser(raw);
    expect(result!.push_token).toBe('tok-123');
    expect(result!.push_enabled).toBe(true);
    expect(result!.notify_bookings).toBe(true);
    expect(result!.notify_booking_updates).toBe(false);
  });

  it('prefers nested profile over top-level fields', () => {
    const raw = {
      id: 'top-level-id',
      email: 'top@example.com',
      profile: {
        id: 'profile-id',
        email: 'profile@example.com',
        role: 'owner',
      },
    };
    const result = normalizeAuthUser(raw);
    expect(result!.id).toBe('profile-id');
    expect(result!.email).toBe('profile@example.com');
  });
});
