/**
 * Unit tests for src/lib/networkRetry.ts
 * Covers: isTransientNetworkError, withTransientNetworkRetry
 */
import { isTransientNetworkError, withTransientNetworkRetry } from '../../src/lib/networkRetry';

// ─── isTransientNetworkError ─────────────────────────────────────────────────

describe('isTransientNetworkError', () => {
  it('returns true for an AppError with kind "network" and "timeout" message', () => {
    const err = {
      kind: 'network',
      message: 'The request timed out',
    };
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it('returns true for network error with "internet" in message', () => {
    const err = {
      kind: 'network',
      message: 'No internet connection',
    };
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it('returns true for network error with "connection" in message', () => {
    const err = {
      kind: 'network',
      message: 'Connection failed',
    };
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it('returns true for network error with OFFLINE code', () => {
    const err = {
      kind: 'network',
      code: 'OFFLINE',
      message: 'You are offline',
    };
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it('returns false for non-network AppError', () => {
    const err = {
      kind: 'validation',
      message: 'Invalid input',
    };
    expect(isTransientNetworkError(err)).toBe(false);
  });

  it('returns false for server error', () => {
    const err = {
      kind: 'server',
      message: 'Internal server error',
    };
    expect(isTransientNetworkError(err)).toBe(false);
  });

  it('returns false for rate_limit error', () => {
    const err = {
      kind: 'rate_limit',
      message: 'Too many requests',
    };
    expect(isTransientNetworkError(err)).toBe(false);
  });

  it('returns false for a plain Error (non-AppError)', () => {
    // A plain Error doesn't have 'kind', so handleApiError will wrap it
    // with kind: 'unknown' — not 'network'
    expect(isTransientNetworkError(new Error('Something broke'))).toBe(false);
  });
});

// ─── withTransientNetworkRetry ──────────────────────────────────────────────

describe('withTransientNetworkRetry', () => {
  it('returns result on first successful attempt', async () => {
    const result = await withTransientNetworkRetry(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('retries on transient error and succeeds on second attempt', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      if (attempt === 1) {
        return Promise.reject({ kind: 'network', message: 'timeout' });
      }
      return Promise.resolve('recovered');
    };

    const result = await withTransientNetworkRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('recovered');
    expect(attempt).toBe(2);
  });

  it('throws after maxAttempts of transient errors', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      return Promise.reject({ kind: 'network', message: 'timeout' });
    };

    await expect(
      withTransientNetworkRetry(fn, { maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toEqual({ kind: 'network', message: 'timeout' });
    expect(attempt).toBe(2);
  });

  it('does not retry non-transient errors (throws immediately)', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      return Promise.reject({ kind: 'validation', message: 'Bad input' });
    };

    await expect(
      withTransientNetworkRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })
    ).rejects.toEqual({ kind: 'validation', message: 'Bad input' });
    expect(attempt).toBe(1);
  });

  it('retries 3 times by default before throwing', async () => {
    let attempt = 0;
    const fn = () => {
      attempt++;
      return Promise.reject({ kind: 'network', message: 'connection failed' });
    };

    await expect(withTransientNetworkRetry(fn, { baseDelayMs: 10 })).rejects.toEqual({
      kind: 'network',
      message: 'connection failed',
    });
    expect(attempt).toBe(3);
  });
});
