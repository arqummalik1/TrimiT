import { describe, it, expect } from 'vitest';
import { GOOGLE_LOGIN_ENABLED, OTP_RESEND_COOLDOWN_SECONDS } from '../../src/config/auth';

describe('auth config', () => {
  it('enables Google login on web auth screens', () => {
    expect(GOOGLE_LOGIN_ENABLED).toBe(true);
  });

  it('uses 30s OTP resend cooldown (matches backend throttle)', () => {
    expect(OTP_RESEND_COOLDOWN_SECONDS).toBe(30);
  });
});
