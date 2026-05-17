import { isAppError } from '../types/error';
import { handleApiError } from './errorHandler';

/** Network/timeout failures that are worth retrying once or twice. */
export function isTransientNetworkError(error: unknown): boolean {
  const appErr = isAppError(error) ? error : handleApiError(error);
  if (appErr.kind !== 'network') {
    return false;
  }
  const msg = appErr.message.toLowerCase();
  return (
    appErr.code === 'OFFLINE' ||
    msg.includes('timeout') ||
    msg.includes('internet') ||
    msg.includes('network') ||
    msg.includes('connection')
  );
}

export async function withTransientNetworkRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 450;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError;
}
