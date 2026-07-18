import { translateGoogleAuthError } from '../../src/lib/googleAuthErrors';

describe('translateGoogleAuthError', () => {
  it('maps duplicate email errors', () => {
    const msg = translateGoogleAuthError('User already registered');
    expect(msg).toContain('already exists');
  });

  it('maps iOS nonce mismatch to a safe retry message (no skip-nonce ops copy)', () => {
    const msg = translateGoogleAuthError(
      'Passed nonce and nonce in id_token should either both exist or not.',
    );
    expect(msg).toContain('try again');
    expect(msg).toContain('email OTP');
    expect(msg.toLowerCase()).not.toContain('skip nonce');
    expect(msg.toLowerCase()).not.toContain('supabase dashboard');
  });

  it('passes through unknown errors', () => {
    expect(translateGoogleAuthError('Network timeout')).toBe('Network timeout');
  });
});
