import {
  GOOGLE_LOGIN_ENABLED,
  isGoogleLoginVisible,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../../src/config/auth';

describe('mobile auth config', () => {
  it('enables Google login on auth screens', () => {
    expect(GOOGLE_LOGIN_ENABLED).toBe(true);
  });

  it('always shows Google login on Android and iOS (no platform hide)', () => {
    expect(isGoogleLoginVisible()).toBe(true);
  });

  it('uses 30s OTP resend cooldown (matches backend throttle)', () => {
    expect(OTP_RESEND_COOLDOWN_SECONDS).toBe(30);
  });
});
