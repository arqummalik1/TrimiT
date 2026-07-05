import { GOOGLE_LOGIN_ENABLED, isGoogleLoginVisible } from '../../src/config/auth';

jest.mock('../../src/services/googleAuthService', () => ({
  isGoogleSignInNativeAvailable: jest.fn(() => true),
}));

describe('mobile auth config', () => {
  it('enables Google login on auth screens', () => {
    expect(GOOGLE_LOGIN_ENABLED).toBe(true);
  });

  it('isGoogleLoginVisible requires native module', () => {
    expect(isGoogleLoginVisible()).toBe(true);
  });
});
