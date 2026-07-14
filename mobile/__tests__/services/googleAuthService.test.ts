import Constants from 'expo-constants';

/**
 * Smoke: googleAuthService must load without crashing even when the native
 * module is absent (Jest has no RNGoogleSignin). Availability may be false.
 */
describe('googleAuthService', () => {
  it('loads without throwing in Jest (no native Google module)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../src/services/googleAuthService') as {
      isGoogleSignInNativeAvailable: () => boolean;
      signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
      signOutGoogle: () => Promise<void>;
    };
    expect(typeof mod.isGoogleSignInNativeAvailable).toBe('function');
    expect(typeof mod.signInWithGoogle).toBe('function');
    // Jest has no native binary — either false (require throws) or true if metro mocks.
    expect(typeof mod.isGoogleSignInNativeAvailable()).toBe('boolean');
    expect(Constants).toBeTruthy();
  });

  it('signOutGoogle is safe when native module is missing (no configured gate)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signOutGoogle } = require('../../src/services/googleAuthService') as {
      signOutGoogle: () => Promise<void>;
    };
    await expect(signOutGoogle()).resolves.toBeUndefined();
  });
});
