/**
 * Unit tests for src/lib/errorHandler.ts
 * Covers: handleApiError — all error kinds and edge cases
 */
import axios from 'axios';
import { handleApiError } from '../../src/lib/errorHandler';

// ─── Already-normalized AppError pass-through ─────────────────────────────────

describe('handleApiError', () => {
  it('returns AppError as-is when already structured', () => {
    const appErr = { kind: 'validation' as const, message: 'Bad input', code: 'BAD_INPUT' };
    const result = handleApiError(appErr);
    expect(result).toBe(appErr);
  });

  // ─── Axios timeout (ECONNABORTED) ──────────────────────────────────────────
  it('maps ECONNABORTED to network kind with timeout message', () => {
    const err = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('network');
    expect(result.message).toMatch(/timed out/i);
  });

  // ─── Axios network error (no response) ──────────────────────────────────────
  it('maps no-response axios error to network kind', () => {
    const err = {
      isAxiosError: true,
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('network');
    expect(result.message).toMatch(/reach TrimiT/i);
  });

  // ─── HTTP 401 ─────────────────────────────────────────────────────────────
  it('maps HTTP 401 to unauthorized kind', () => {
    const err = {
      isAxiosError: true,
      response: { status: 401, data: {}, headers: {} },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('unauthorized');
    expect(result.status).toBe(401);
  });

  // ─── HTTP 400 ─────────────────────────────────────────────────────────────
  it('maps HTTP 400 to validation kind', () => {
    const err = {
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Invalid input' }, headers: {} },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('validation');
    expect(result.status).toBe(400);
  });

  // ─── HTTP 409 ─────────────────────────────────────────────────────────────
  it('maps HTTP 409 to conflict kind', () => {
    const err = {
      isAxiosError: true,
      response: { status: 409, data: { detail: 'Conflict' }, headers: {} },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('conflict');
  });

  // ─── HTTP 429 ─────────────────────────────────────────────────────────────
  it('maps HTTP 429 to rate_limit kind', () => {
    const err = {
      isAxiosError: true,
      response: { status: 429, data: {}, headers: {} },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('rate_limit');
  });

  // ─── HTTP 500 ─────────────────────────────────────────────────────────────
  it('maps HTTP 500 to server kind', () => {
    const err = {
      isAxiosError: true,
      response: { status: 500, data: {}, headers: {} },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.kind).toBe('server');
  });

  // ─── Backend unified error shape ──────────────────────────────────────────
  it('extracts nested error.code and error.message from unified backend shape', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          success: false,
          error: { code: 'SLOT_FULL', message: 'This slot is already booked', details: {} },
          request_id: 'req-123',
        },
        headers: { 'x-request-id': 'req-123' },
      },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.code).toBe('SLOT_FULL');
    expect(result.message).toBe('This slot is already booked');
    expect(result.requestId).toBe('req-123');
  });

  // ─── FastAPI detail object shape ──────────────────────────────────────────
  it('extracts from FastAPI { detail: { message, code } } shape', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { detail: { message: 'Email already registered', code: 'DUPLICATE_EMAIL' } },
        headers: {},
      },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.code).toBe('DUPLICATE_EMAIL');
    expect(result.message).toBe('Email already registered');
  });

  // ─── Plain string detail fallback ──────────────────────────────────────────
  it('uses string detail when no structured error', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { detail: 'Something went wrong' },
        headers: {},
      },
      config: {},
      toJSON: () => ({}),
    };
    const result = handleApiError(err);
    expect(result.message).toBe('Something went wrong');
  });

  // ─── Plain Error fallback ──────────────────────────────────────────────────
  it('wraps a plain Error with unknown kind', () => {
    const result = handleApiError(new Error('Something broke'));
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('Something broke');
  });

  // ─── Completely unknown error ──────────────────────────────────────────────
  it('handles non-Error, non-Axios values', () => {
    const result = handleApiError('string error');
    expect(result.kind).toBe('unknown');
  });
});
