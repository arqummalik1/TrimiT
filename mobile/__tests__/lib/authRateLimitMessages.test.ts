/**
 * Unit tests for src/lib/authRateLimitMessages.ts
 * Covers: isAuthEmailRateLimited, getAuthRateLimitMessage, exported constants
 */
import {
  isAuthEmailRateLimited,
  getAuthRateLimitMessage,
  AUTH_EMAIL_COOLDOWN_TITLE,
  AUTH_EMAIL_COOLDOWN_MESSAGE,
  AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE,
  AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE,
} from '../../src/lib/authRateLimitMessages';

describe('authRateLimitMessages', () => {
  // ─── Constants ─────────────────────────────────────────────────────────────
  it('AUTH_EMAIL_COOLDOWN_TITLE is a non-empty string', () => {
    expect(typeof AUTH_EMAIL_COOLDOWN_TITLE).toBe('string');
    expect(AUTH_EMAIL_COOLDOWN_TITLE.length).toBeGreaterThan(0);
  });

  it('AUTH_EMAIL_COOLDOWN_MESSAGE is a multi-line string', () => {
    expect(AUTH_EMAIL_COOLDOWN_MESSAGE).toContain('\n');
    expect(AUTH_EMAIL_COOLDOWN_MESSAGE).toMatch(/about an hour/i);
  });

  it('AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE mentions password reset', () => {
    expect(AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE).toMatch(/password/i);
  });

  it('AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE mentions confirmation', () => {
    expect(AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE).toMatch(/confirm/i);
  });

  // ─── isAuthEmailRateLimited ───────────────────────────────────────────────

  describe('isAuthEmailRateLimited', () => {
    it('returns true for AUTH_PROVIDER_EMAIL_QUOTA', () => {
      expect(isAuthEmailRateLimited('AUTH_PROVIDER_EMAIL_QUOTA')).toBe(true);
    });

    it('returns true for EMAIL_RATE_LIMIT', () => {
      expect(isAuthEmailRateLimited('EMAIL_RATE_LIMIT')).toBe(true);
    });

    it('returns true for RATE_LIMIT_EXCEEDED', () => {
      expect(isAuthEmailRateLimited('RATE_LIMIT_EXCEEDED')).toBe(true);
    });

    it('returns true for RATE_LIMITED', () => {
      expect(isAuthEmailRateLimited('RATE_LIMITED')).toBe(true);
    });

    it('returns false for unknown codes', () => {
      expect(isAuthEmailRateLimited('SLOT_FULL')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAuthEmailRateLimited(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAuthEmailRateLimited(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isAuthEmailRateLimited('')).toBe(false);
    });
  });

  // ─── getAuthRateLimitMessage ──────────────────────────────────────────────

  describe('getAuthRateLimitMessage', () => {
    it('returns generic message for RATE_LIMIT_EXCEEDED + signup context', () => {
      const msg = getAuthRateLimitMessage('RATE_LIMIT_EXCEEDED', 'signup');
      expect(msg).toMatch(/about an hour/i);
    });

    it('returns forgot-specific message for RATE_LIMIT_EXCEEDED + forgot context', () => {
      const msg = getAuthRateLimitMessage('RATE_LIMIT_EXCEEDED', 'forgot');
      expect(msg).toBe(AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE);
    });

    it('returns resend-specific message for EMAIL_RATE_LIMIT + resend context', () => {
      const msg = getAuthRateLimitMessage('EMAIL_RATE_LIMIT', 'resend');
      expect(msg).toBe(AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE);
    });

    it('returns resend-specific message for AUTH_PROVIDER_EMAIL_QUOTA + resend', () => {
      const msg = getAuthRateLimitMessage('AUTH_PROVIDER_EMAIL_QUOTA', 'resend');
      expect(msg).toBe(AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE);
    });

    it('returns resend-specific message for RATE_LIMITED + resend', () => {
      const msg = getAuthRateLimitMessage('RATE_LIMITED', 'resend');
      expect(msg).toBe(AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE);
    });

    it('returns generic for known code without matching context override', () => {
      const msg = getAuthRateLimitMessage('EMAIL_RATE_LIMIT', 'generic');
      expect(msg).toBe(AUTH_EMAIL_COOLDOWN_MESSAGE);
    });

    it('returns forgot message for unknown code with forgot context', () => {
      const msg = getAuthRateLimitMessage(null, 'forgot');
      expect(msg).toBe(AUTH_FORGOT_PASSWORD_COOLDOWN_MESSAGE);
    });

    it('returns resend message for unknown code with resend context', () => {
      const msg = getAuthRateLimitMessage(null, 'resend');
      expect(msg).toBe(AUTH_RESEND_CONFIRM_COOLDOWN_MESSAGE);
    });

    it('returns generic message for unknown code with generic context', () => {
      const msg = getAuthRateLimitMessage(null, 'generic');
      expect(msg).toBe(AUTH_EMAIL_COOLDOWN_MESSAGE);
    });

    it('returns generic message when no code and no context provided', () => {
      const msg = getAuthRateLimitMessage(undefined);
      expect(msg).toBe(AUTH_EMAIL_COOLDOWN_MESSAGE);
    });
  });
});
