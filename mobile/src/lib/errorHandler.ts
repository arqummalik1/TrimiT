/**
 * errorHandler.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized API error classification and user-facing message mapping.
 *
 * ALL error handling in the app must flow through handleApiError().
 * Never inspect AxiosError shapes in UI components or ViewModels directly.
 *
 * Data flow:
 *   API failure → axios interceptor or catch block
 *     → handleApiError(error)
 *     → AppError { type, message, statusCode? }
 *     → passed to ErrorState component or showToast
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { isAxiosError } from 'axios';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type AppErrorType =
  | 'network'     // No internet / DNS failure
  | 'timeout'     // Request exceeded timeout threshold
  | 'server'      // 5xx responses
  | 'auth'        // 401 — session expired
  | 'forbidden'   // 403 — insufficient permissions
  | 'not_found'   // 404
  | 'validation'  // 400 / 422 — user input errors
  | 'conflict'    // 409 — resource conflict (e.g. slot already booked)
  | 'unknown';    // Catch-all

export interface AppError {
  type: AppErrorType;
  message: string;       // User-facing, safe to display
  statusCode?: number;
  raw?: unknown;         // Original error — for logging only, never display
}

// ─── User-Facing Message Map ──────────────────────────────────────────────────

const ERROR_MESSAGES: Record<AppErrorType, string> = {
  network:    'No internet connection. Check your network and try again.',
  timeout:    'Request is taking too long. Please try again.',
  server:     'Something went wrong on our end. Please try again shortly.',
  auth:       'Your session has expired. Please sign in again.',
  forbidden:  'You don\'t have permission to do that.',
  not_found:  'The requested resource could not be found.',
  validation: 'Please check your input and try again.',
  conflict:   'This slot is no longer available. Please choose another.',
  unknown:    'An unexpected error occurred. Please try again.',
};

// ─── Core Classifier ─────────────────────────────────────────────────────────

/**
 * Converts any thrown value into a structured, typed AppError.
 *
 * @param error - The raw error from a catch block or axios interceptor.
 * @returns AppError — safe to store in state and pass to UI components.
 */
export function handleApiError(error: unknown): AppError {
  // ── Axios errors ──────────────────────────────────────────────────────────
  if (isAxiosError(error)) {
    // 1. Timeout (ECONNABORTED)
    if (error.code === 'ECONNABORTED') {
      return {
        type: 'timeout',
        message: ERROR_MESSAGES.timeout,
        raw: error,
      };
    }

    // 2. No response at all → network failure
    if (!error.response) {
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      return {
        type: 'network',
        message: isDev
          ? 'Cannot reach server. Check your .env and Wi-Fi connection.'
          : ERROR_MESSAGES.network,
        raw: error,
      };
    }

    const { status, data } = error.response;
    // Extract the most specific server-provided message possible
    const serverMessage: string | undefined =
      typeof data?.detail === 'string'
        ? data.detail
        : typeof data?.message === 'string'
        ? data.message
        : undefined;

    // 3. HTTP status code mapping
    if (status === 401) {
      return { type: 'auth', message: ERROR_MESSAGES.auth, statusCode: 401, raw: error };
    }
    if (status === 403) {
      return { type: 'forbidden', message: ERROR_MESSAGES.forbidden, statusCode: 403, raw: error };
    }
    if (status === 404) {
      return { type: 'not_found', message: serverMessage ?? ERROR_MESSAGES.not_found, statusCode: 404, raw: error };
    }
    if (status === 409) {
      return { type: 'conflict', message: serverMessage ?? ERROR_MESSAGES.conflict, statusCode: 409, raw: error };
    }
    if (status === 400 || status === 422) {
      return {
        type: 'validation',
        message: serverMessage ?? ERROR_MESSAGES.validation,
        statusCode: status,
        raw: error,
      };
    }
    if (status >= 500) {
      return { type: 'server', message: ERROR_MESSAGES.server, statusCode: status, raw: error };
    }
  }

  // ── Non-Axios errors (JS runtime errors, etc.) ─────────────────────────────
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: ERROR_MESSAGES.unknown,
      raw: error,
    };
  }

  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown,
    raw: error,
  };
}

/**
 * Extracts just the user-facing message string from any error.
 * Convenience wrapper for toast calls.
 */
export function getErrorMessage(error: unknown): string {
  return handleApiError(error).message;
}

/**
 * Returns true if the error indicates the user should be signed out.
 */
export function isAuthError(error: AppError): boolean {
  return error.type === 'auth';
}

/**
 * Returns true if the error is purely due to no internet connectivity.
 */
export function isNetworkError(error: AppError): boolean {
  return error.type === 'network';
}
