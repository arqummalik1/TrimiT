import { describe, it, expect } from 'vitest';
import { resolvePostLoginPath } from '../../src/lib/postLoginRedirect';

describe('resolvePostLoginPath', () => {
  it('sends owners with a salon to the owner dashboard', () => {
    expect(
      resolvePostLoginPath({ profile: { role: 'owner' }, hasSalon: true })
    ).toBe('/owner/dashboard');
  });

  it('sends owners without a salon to salon setup', () => {
    expect(
      resolvePostLoginPath({ profile: { role: 'owner' }, hasSalon: false })
    ).toBe('/owner/salon');
  });

  it('sends customers to explore, never the marketing home page', () => {
    expect(resolvePostLoginPath({ profile: { role: 'customer' } })).toBe('/explore');
  });

  it('gates an invitation-pending account into employee access', () => {
    expect(
      resolvePostLoginPath({ profileComplete: false, profile: { role: 'customer' } })
    ).toBe('/employee-access');
    expect(resolvePostLoginPath({ profile: null })).toBe('/employee-access');
    expect(resolvePostLoginPath({ profile: {} })).toBe('/employee-access');
    expect(resolvePostLoginPath()).toBe('/employee-access');
  });

  it('honours an explicit internal redirect over role-based routing', () => {
    expect(
      resolvePostLoginPath({
        profile: { role: 'customer' },
        redirectTo: '/booking/salon-1/service-2',
      })
    ).toBe('/booking/salon-1/service-2');
    expect(
      resolvePostLoginPath({
        profile: { role: 'owner' },
        hasSalon: true,
        redirectTo: '/owner/bookings',
      })
    ).toBe('/owner/bookings');
  });

  it('completing the profile wins over a redirect param', () => {
    expect(
      resolvePostLoginPath({ profileComplete: false, redirectTo: '/my-bookings' })
    ).toBe('/employee-access');
  });

  it('ignores off-site redirect targets (safeInternalPath sanitization)', () => {
    ['https://evil.com', '//evil.com', 'javascript:alert(1)', '', null].forEach(
      (redirectTo) => {
        expect(
          resolvePostLoginPath({ profile: { role: 'customer' }, redirectTo })
        ).toBe('/explore');
      }
    );
  });
});
