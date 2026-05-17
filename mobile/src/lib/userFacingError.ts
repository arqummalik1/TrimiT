import { isAppError } from '../types/error';
import { handleApiError } from './errorHandler';
import { ImageTooLargeError, IMAGE_TOO_LARGE_MESSAGE } from './imageUploadPrep';
import {
  getAuthRateLimitMessage,
  isAuthEmailRateLimited,
  type AuthRateLimitContext,
} from './authRateLimitMessages';

const MESSAGES: Record<string, string> = {
  network:
    'No internet connection. Please check your network and try again.',
  timeout:
    'The request took too long. Please try again.',
  server:
    'Something went wrong on our side. Please try again in a moment.',
  rate_limit:
    "You've made several requests in a short time. Please wait about an hour before trying again, and avoid repeated taps.",
  unauthorized:
    'Your session expired. Please sign in again.',
  validation: 'Please check your input and try again.',
  conflict: 'This action could not be completed. Please refresh and try again.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Normalize any thrown value into a user-safe message (never raw axios/console text).
 */
export function getUserFacingMessage(
  error: unknown,
  options?: { authContext?: AuthRateLimitContext }
): string {
  if (error instanceof ImageTooLargeError) {
    return error.message;
  }

  const appErr = isAppError(error) ? error : handleApiError(error);

  if (isAuthEmailRateLimited(appErr.code)) {
    return getAuthRateLimitMessage(appErr.code, options?.authContext ?? 'generic');
  }

  if (appErr.kind === 'rate_limit') {
    return getAuthRateLimitMessage(appErr.code, options?.authContext ?? 'generic');
  }

  if (appErr.code === 'FILE_TOO_LARGE') {
    return IMAGE_TOO_LARGE_MESSAGE;
  }

  if (appErr.code === 'INVALID_IMAGE' || appErr.code === 'INVALID_FILE_TYPE') {
    return 'Could not use this photo. Try another image or take a new picture.';
  }

  if (appErr.code === 'UPLOAD_FAILED') {
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
