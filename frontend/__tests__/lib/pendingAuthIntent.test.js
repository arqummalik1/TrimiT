import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumePendingAuthIntent,
  intentForProtectedPath,
  pathForPendingAuthIntent,
  peekPendingAuthIntent,
  roleForPendingAuthIntent,
  setPendingAuthIntent,
} from '../../src/lib/pendingAuthIntent';

describe('pendingAuthIntent', () => {
  beforeEach(() => sessionStorage.clear());

  it('stores and consumes an allowlisted booking once', () => {
    setPendingAuthIntent({ kind: 'customer_booking', salonId: 'salon-1', serviceId: 'service-2' });
    expect(pathForPendingAuthIntent(peekPendingAuthIntent())).toBe('/booking/salon-1/service-2');
    expect(consumePendingAuthIntent()?.kind).toBe('customer_booking');
    expect(consumePendingAuthIntent()).toBeNull();
  });

  it('rejects malformed or unknown persisted destinations', () => {
    sessionStorage.setItem('trimit-web-auth-intent-v1', JSON.stringify({
      kind: 'admin', createdAt: Date.now(), expiresAt: Date.now() + 1000,
    }));
    expect(peekPendingAuthIntent()).toBeNull();
  });

  it('maps only explicit team actions to privileged roles', () => {
    expect(roleForPendingAuthIntent({ kind: 'owner_onboarding' })).toBe('owner');
    expect(roleForPendingAuthIntent({ kind: 'employee_claim' })).toBe('employee');
    expect(roleForPendingAuthIntent({ kind: 'profile' })).toBe('customer');
  });

  it('converts only approved protected paths into intents', () => {
    expect(intentForProtectedPath('/booking/s1/s2')).toEqual({
      kind: 'customer_booking', salonId: 's1', serviceId: 's2',
    });
    expect(intentForProtectedPath('/owner/settings')).toEqual({
      kind: 'owner_onboarding', destination: '/owner/settings',
    });
    const deletionIntent = intentForProtectedPath('/delete-account');
    expect(deletionIntent).toEqual({ kind: 'account_deletion' });
    expect(pathForPendingAuthIntent({
      ...deletionIntent,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
    })).toBe('/delete-account');
  });
});
