import { translateGoogleAuthError } from '../../src/lib/googleAuthErrors';

describe('translateGoogleAuthError', () => {
  it('maps duplicate email errors', () => {
    const msg = translateGoogleAuthError('User already registered');
    expect(msg).toContain('already exists');
  });

  it('maps iOS nonce mismatch to Supabase dashboard fix', () => {
    const msg = translateGoogleAuthError(
      'Passed nonce and nonce in id_token should either both exist or not.',
    );
    expect(msg).toContain('Skip nonce checks');
  });

  it('passes through unknown errors', () => {
    expect(translateGoogleAuthError('Network timeout')).toBe('Network timeout');
  });
});
