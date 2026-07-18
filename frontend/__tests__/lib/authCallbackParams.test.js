import { describe, it, expect } from 'vitest';
import {
  parseAuthCallbackFromUrl,
  resolveAuthCallbackRedirect,
} from '../../src/lib/authCallbackParams';
import { extractRecoveryToken } from '../../src/lib/recoveryToken';

function fakeLocation({ hash = '', search = '', pathname = '/' } = {}) {
  return { hash, search, pathname };
}

describe('parseAuthCallbackFromUrl', () => {
  it('flags password recovery from hash type=recovery', () => {
    const parsed = parseAuthCallbackFromUrl(
      fakeLocation({
        hash: '#access_token=tok_recovery&type=recovery&expires_in=3600',
      })
    );
    expect(parsed.isPasswordRecovery).toBe(true);
    expect(parsed.isEmailConfirmation).toBe(false);
    expect(parsed.accessToken).toBe('tok_recovery');
  });

  it('flags email confirmation from type=signup', () => {
    const parsed = parseAuthCallbackFromUrl(
      fakeLocation({
        hash: '#access_token=tok_signup&type=signup',
      })
    );
    expect(parsed.isEmailConfirmation).toBe(true);
    expect(parsed.isPasswordRecovery).toBe(false);
  });
});

describe('resolveAuthCallbackRedirect', () => {
  it('sends Site-URL recovery dumps to /reset-password', () => {
    const parsed = parseAuthCallbackFromUrl(
      fakeLocation({
        hash: '#access_token=tok&type=recovery&token_type=bearer',
      })
    );
    expect(resolveAuthCallbackRedirect('/', parsed)).toBe('/reset-password');
  });

  it('sends email confirmation dumps to /auth/email-confirmed', () => {
    const parsed = parseAuthCallbackFromUrl(
      fakeLocation({
        hash: '#access_token=tok&type=signup',
      })
    );
    expect(resolveAuthCallbackRedirect('/', parsed)).toBe('/auth/email-confirmed');
  });

  it('does not re-route when already on /reset-password', () => {
    const parsed = parseAuthCallbackFromUrl(
      fakeLocation({
        hash: '#access_token=tok&type=recovery',
      })
    );
    expect(resolveAuthCallbackRedirect('/reset-password', parsed)).toBeNull();
  });

  it('ignores ordinary home visits with no auth hash', () => {
    const parsed = parseAuthCallbackFromUrl(fakeLocation({ hash: '' }));
    expect(resolveAuthCallbackRedirect('/', parsed)).toBeNull();
  });
});

describe('extractRecoveryToken', () => {
  it('reads access_token from recovery hash', () => {
    const prev = window.location.href;
    window.history.replaceState(
      null,
      '',
      '/reset-password#access_token=abc123&type=recovery'
    );
    expect(extractRecoveryToken()).toBe('abc123');
    window.history.replaceState(null, '', prev);
  });
});
