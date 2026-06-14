/**
 * api.ts — default HTTP client for screens that still import from `lib/api`.
 * Base URL is always `…/api/v1`; paths here are relative (e.g. `/staff/...`).
 * Prefer `services/*` for new code.
 */

import apiClient, { setAuthToken as newSetAuthToken } from '../services/apiClient';

export const axios = require('axios');
export const setAuthToken = newSetAuthToken;
export default apiClient;

