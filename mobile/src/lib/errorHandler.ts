import { AppError, ErrorKind } from '../types/error';
import axios from 'axios';
import { logger } from './logger';

export const handleApiError = (error: unknown): AppError => {
  let kind: ErrorKind = 'unknown';
  let message = 'An unexpected error occurred';
  let code: string | undefined;
  let requestId: string | undefined;

  if (axios.isAxiosError(error)) {
    requestId = error.response?.headers['x-request-id'];
    
    if (!error.response) {
      kind = 'network';
      message = 'Check your internet connection';
    } else {
      const status = error.response.status;
      const data = error.response.data;
      
      // Senior Architect: Extract structured error data
      if (typeof data?.detail === 'object') {
        message = data.detail.message || message;
        code = data.detail.code;
      } else {
        message = data?.detail || data?.error?.message || error.message;
        code = data?.error?.code;
      }

      if (status === 401) kind = 'unauthorized';
      else if (status === 400) kind = 'validation';
      else if (status === 409) kind = 'conflict';
      else if (status === 429) kind = 'rate_limit';
      else if (status >= 500) kind = 'server';
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Senior Architect: Report server crashes and critical network issues to Sentry
  if (kind === 'server' || kind === 'network') {
    logger.error(`API Error: ${kind}`, error, { requestId, code, status: axios.isAxiosError(error) ? error.response?.status : 'N/A' });
  }

  return {
    kind,
    message,
    code,
    requestId,
    originalError: error
  };
};
