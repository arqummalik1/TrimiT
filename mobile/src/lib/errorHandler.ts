import { AppError, ErrorKind } from '../types/error';
import axios from 'axios';
import { logger } from './logger';

export const handleApiError = (error: unknown): AppError => {
  let kind: ErrorKind = 'unknown';
  let message = 'An unexpected error occurred';
  let code: string | undefined;
  let requestId: string | undefined;
  let status: number | undefined;
  let details: unknown;

  if (axios.isAxiosError(error)) {
    status = error.response?.status;
    requestId = error.response?.headers?.['x-request-id'];
    
    if (!error.response) {
      kind = 'network';
      message = 'Check your internet connection';
    } else {
      const data = error.response.data;
      
      // Prefer our backend unified error shape:
      // { success:false, error:{ code, message, details }, request_id }
      if (data?.error && typeof data.error === 'object') {
        message = data.error.message || message;
        code = data.error.code;
        details = data.error.details;
        requestId = requestId || data.request_id;
      } else if (typeof data?.detail === 'object') {
        // FastAPI default: { detail: { message, code, ... } }
        message = data.detail.message || message;
        code = data.detail.code;
        details = data.detail;
      } else {
        message = data?.detail || data?.message || error.message;
      }

      if (status === 401) kind = 'unauthorized';
      else if (status === 400) kind = 'validation';
      else if (status === 409) kind = 'conflict';
      else if (status === 429) kind = 'rate_limit';
      else if (typeof status === 'number' && status >= 500) kind = 'server';
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
    status,
    details,
    originalError: error
  };
};
