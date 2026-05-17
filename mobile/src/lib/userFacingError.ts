import { isAppError } from '../types/error';
import { handleApiError } from './errorHandler';

const MESSAGES: Record<string, string> = {
  network:
    'No internet connection. Please check your network and try again.',
  timeout:
    'The request took too long. Please try again.',
  server:
    'Something went wrong on our side. Please try again in a moment.',
  rate_limit:
    'Too many attempts. Please wait a minute and try again.',
  unauthorized:
    'Your session expired. Please sign in again.',
  validation: 'Please check your input and try again.',
  conflict: 'This action could not be completed. Please refresh and try again.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Normalize any thrown value into a user-safe message (never raw axios/console text).
 */
export function getUserFacingMessage(error: unknown): string {
  const appErr = isAppError(error) ? error : handleApiError(error);

  if (appErr.code === 'UPLOAD_FAILED' || appErr.code === 'FILE_TOO_LARGE') {
    return appErr.message;
  }

  if (appErr.kind === 'network' && appErr.message.toLowerCase().includes('timeout')) {
    return MESSAGES.timeout;
  }

  return MESSAGES[appErr.kind] ?? appErr.message ?? MESSAGES.unknown;
}

export function getUserFacingError(error: unknown) {
  return isAppError(error) ? error : handleApiError(error);
}
