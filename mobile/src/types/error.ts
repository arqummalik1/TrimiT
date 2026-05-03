/**
 * error.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Discriminated union for application-wide error handling.
 * Eliminates 'any' and ensures consistent UI messaging.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ErrorKind = 
  | 'network'       // Connection issues, timeouts
  | 'unauthorized'  // 401, session expired
  | 'validation'    // 400, form errors
  | 'conflict'      // 409, slot taken
  | 'server'        // 500, backend crash
  | 'rate_limit'    // 429, too many requests
  | 'unknown';      // Fallback

export interface AppError {
  kind: ErrorKind;
  message: string;
  code?: string;      // Machine-readable code from backend (e.g. 'SLOT_FULL')
  requestId?: string; // X-Request-ID for tracing
  originalError?: unknown;
}

export const isAppError = (error: unknown): error is AppError => {
  return (
    !!error && 
    typeof error === 'object' &&
    'kind' in error &&
    'message' in error
  );
};
