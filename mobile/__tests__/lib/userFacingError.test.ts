/**
 * Unit tests for src/lib/userFacingError.ts
 * Covers: getUserFacingMessage, getUserFacingError
 */
import { getUserFacingMessage, getUserFacingError } from '../../src/lib/userFacingError';
import { ImageTooLargeError } from '../../src/lib/imageUploadPrep';

describe('getUserFacingMessage', () => {
  it('returns ImageTooLargeError message directly', () => {
    const err = new ImageTooLargeError();
    expect(getUserFacingMessage(err)).toBe(err.message);
  });

  it('returns timeout message for network errors with "timeout"', () => {
    const appErr = { kind: 'network' as const, message: 'request timed out' };
    expect(getUserFacingMessage(appErr)).toMatch(/too long/i);
  });

  it('returns "session expired" for unauthorized errors', () => {
    const appErr = { kind: 'unauthorized' as const, message: 'Token expired' };
    expect(getUserFacingMessage(appErr)).toMatch(/session expired/i);
  });

  it('returns rate limit message for rate_limit kind', () => {
    const appErr = { kind: 'rate_limit' as const, message: 'Too many requests' };
    expect(getUserFacingMessage(appErr)).toMatch(/several requests/i);
  });

  it('returns FILE_TOO_LARGE specific message', () => {
    const appErr = { kind: 'unknown' as const, message: 'File too large', code: 'FILE_TOO_LARGE' };
    expect(getUserFacingMessage(appErr)).toMatch(/too large to upload/i);
  });

  it('returns specific message for INVALID_IMAGE code', () => {
    const appErr = { kind: 'unknown' as const, message: 'Invalid image', code: 'INVALID_IMAGE' };
    expect(getUserFacingMessage(appErr)).toMatch(/could not use this photo/i);
  });

  it('returns specific message for INVALID_FILE_TYPE code', () => {
    const appErr = { kind: 'unknown' as const, message: 'Bad type', code: 'INVALID_FILE_TYPE' };
    expect(getUserFacingMessage(appErr)).toMatch(/could not use this photo/i);
  });

  it('surfaces UPLOAD_FAILED backend message', () => {
    const appErr = { kind: 'server' as const, message: 'S3 upload failed', code: 'UPLOAD_FAILED' };
    expect(getUserFacingMessage(appErr)).toBe('S3 upload failed');
  });

  it('returns backend validation message when specific (not generic fallback)', () => {
    const appErr = {
      kind: 'validation' as const,
      message: 'You already have a salon registered.',
    };
    expect(getUserFacingMessage(appErr)).toBe('You already have a salon registered.');
  });

  it('falls back to generic for validation errors with axios-default message', () => {
    const appErr = {
      kind: 'validation' as const,
      message: 'Request failed with status code 400',
    };
    expect(getUserFacingMessage(appErr)).toMatch(/check your input/i);
  });

  it('returns generic "something went wrong" for unknown errors', () => {
    const appErr = { kind: 'unknown' as const, message: 'Internal stuff' };
    expect(getUserFacingMessage(appErr)).toMatch(/something went wrong/i);
  });

  it('returns server error message for 500+ kind', () => {
    const appErr = { kind: 'server' as const, message: '500 crash' };
    expect(getUserFacingMessage(appErr)).toMatch(/our side/i);
  });

  it('returns conflict message for 409 kind', () => {
    const appErr = { kind: 'conflict' as const, message: 'Slot taken' };
    expect(getUserFacingMessage(appErr)).toBe('Slot taken');
  });

  it('returns conflict-specific backend message (not generic) when specific', () => {
    const appErr = { kind: 'conflict' as const, message: 'This time slot is already booked.' };
    expect(getUserFacingMessage(appErr)).toBe('This time slot is already booked.');
  });

  it('returns auth rate limit message when code is EMAIL_RATE_LIMIT', () => {
    const appErr = {
      kind: 'rate_limit' as const,
      message: 'Rate limited',
      code: 'EMAIL_RATE_LIMIT',
    };
    expect(getUserFacingMessage(appErr, { authContext: 'signup' })).toMatch(/about an hour/i);
  });

  it('returns "no internet" for network errors', () => {
    const appErr = { kind: 'network' as const, message: 'No internet' };
    expect(getUserFacingMessage(appErr)).toMatch(/no internet/i);
  });
});

describe('getUserFacingError', () => {
  it('returns AppError as-is when already structured', () => {
    const appErr = { kind: 'validation' as const, message: 'Bad' };
    expect(getUserFacingError(appErr)).toBe(appErr);
  });

  it('wraps a plain Error into an AppError', () => {
    const result = getUserFacingError(new Error('broken'));
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('broken');
  });
});
