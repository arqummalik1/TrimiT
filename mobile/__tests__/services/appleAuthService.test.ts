/**
 * appleAuthService — unit tests with mocked expo-apple-authentication + expo-crypto.
 * Does not re-mock react-native (jest-expo Platform is iOS).
 */

const mockIsAvailableAsync = jest.fn();
const mockSignInAsync = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: (...a: unknown[]) => mockIsAvailableAsync(...a),
  signInAsync: (...a: unknown[]) => mockSignInAsync(...a),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (n: number) => {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) out[i] = i + 1;
    return out;
  }),
  digestStringAsync: jest.fn(async (_algo: unknown, value: string) => `hashed:${value}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
}));

import {
  __resetAppleSignInCacheForTests,
  isAppleSignInAvailable,
  isAppleSignInNativeAvailable,
  signInWithApple,
} from '../../src/services/appleAuthService';

describe('appleAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAppleSignInCacheForTests();
    mockIsAvailableAsync.mockResolvedValue(true);
  });

  it('reports native + device availability when module loads', async () => {
    expect(typeof isAppleSignInNativeAvailable()).toBe('boolean');
    await expect(isAppleSignInAvailable()).resolves.toBe(true);
  });

  it('returns idToken + rawNonce on success', async () => {
    mockSignInAsync.mockResolvedValue({
      identityToken: 'apple.jwt.token',
      fullName: { givenName: 'Ada', familyName: 'Lovelace' },
    });

    const result = await signInWithApple();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idToken).toBe('apple.jwt.token');
      expect(result.rawNonce.length).toBeGreaterThan(10);
      expect(result.fullName).toBe('Ada Lovelace');
    }
    expect(mockSignInAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: expect.stringMatching(/^hashed:/),
      }),
    );
  });

  it('maps cancel code', async () => {
    mockSignInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    const result = await signInWithApple();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.cancelled).toBe(true);
    }
  });

  it('fails when identityToken missing', async () => {
    mockSignInAsync.mockResolvedValue({ identityToken: null });
    const result = await signInWithApple();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/identity token/i);
    }
  });
});
