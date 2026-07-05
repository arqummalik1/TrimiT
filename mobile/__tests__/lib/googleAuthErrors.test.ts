import { translateGoogleAuthError } from '../../src/lib/googleAuthErrors';

describe('translateGoogleAuthError', () => {
  it('maps duplicate email errors', () => {
    const msg = translateGoogleAuthError('User already registered');
    expect(msg).toContain('already exists');
  });

  it('passes through unknown errors', () => {
    expect(translateGoogleAuthError('Network timeout')).toBe('Network timeout');
  });
});
