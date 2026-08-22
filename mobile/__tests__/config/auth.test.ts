import {
  GOOGLE_LOGIN_ENABLED,
  APPLE_LOGIN_ENABLED,
  isGoogleLoginVisible,
  isAppleLoginVisible,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../../src/config/auth';

describe('mobile auth config', () => {
  it('enables Google login on auth screens', () => {
    expect(GOOGLE_LOGIN_ENABLED).toBe(true);
  });

  it('always shows Google login on Android and iOS (no platform hide)', () => {
    expect(isGoogleLoginVisible()).toBe(true);
  });

  it('enables Apple login flag (iOS-only visibility via Platform)', () => {
    expect(APPLE_LOGIN_ENABLED).toBe(true);
    expect(typeof isAppleLoginVisible()).toBe('boolean');
  });

  it('uses 30s OTP resend cooldown (matches backend throttle)', () => {
    expect(OTP_RESEND_COOLDOWN_SECONDS).toBe(30);
  });
});
