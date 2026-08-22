import { translateAppleAuthError } from '../../src/lib/appleAuthErrors';

describe('translateAppleAuthError', () => {
  it('maps already-registered / identity link / nonce / provider errors', () => {
    expect(translateAppleAuthError('User already registered')).toMatch(/one account/i);
    expect(translateAppleAuthError('Identity is already linked')).toMatch(/link Apple/i);
    expect(translateAppleAuthError('Nonce check failed')).toMatch(/could not be verified/i);
    expect(translateAppleAuthError('Provider is not enabled')).toMatch(/not fully configured/i);
  });

  it('falls back to raw message or default', () => {
    expect(translateAppleAuthError('Something odd')).toBe('Something odd');
    expect(translateAppleAuthError(undefined)).toMatch(/failed/i);
  });
});
