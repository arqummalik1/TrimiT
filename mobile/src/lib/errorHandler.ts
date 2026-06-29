import { AppError, ErrorKind, isAppError } from '../types/error';
import axios from 'axios';
import { logger } from './logger';

export const handleApiError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  let kind: ErrorKind = 'unknown';
  let message = 'An unexpected error occurred';
  let code: string | undefined;
  let requestId: string | undefined;
  let status: number | undefined;
  let details: unknown;

  if (axios.isAxiosError(error)) {
    status = error.response?.status;
    requestId = error.response?.headers?.['x-request-id'];
    
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      kind = 'network';
      message = 'The request timed out. Please try again.';
    } else if (!error.response) {
      kind = 'network';
      message = 'No internet connection. Please check your network and try again.';
    } else {
      const data = error.response.data;
      
      // Prefer our backend unified error shape:
      // { success:false, error:{ code, message, details }, request_id }
      if (data?.error && typeof data.error === 'object') {
        const errObj = data.error;
        const nested = errObj.details;
        if (nested && typeof nested === 'object') {
          const nestedMsg = (nested as { message?: string }).message;
          const nestedCode = (nested as { code?: string }).code;
          if (nestedMsg) message = nestedMsg;
          if (nestedCode) code = nestedCode;
        }
        message = errObj.message || message;
        code = code || errObj.code;
        details = errObj.details;
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

      // Owner subscription lapsed (HTTP 402). Never surface a raw gate error —
      // the SubscriptionGate overlay handles the UX; this keeps any incidental
      // alert friendly.
      if (status === 402 || code === 'SUBSCRIPTION_REQUIRED') {
        message = 'Your TrimiT Pro subscription has expired. Subscribe to continue.';
      }
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  if (kind === 'server') {
    logger.error(`API Error: ${kind}`, error, {
      requestId,
      code,
      status: axios.isAxiosError(error) ? error.response?.status : 'N/A',
    });
  } else if (kind === 'network') {
    logger.warn(`API Error: ${kind}`, { requestId, code, message });
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
