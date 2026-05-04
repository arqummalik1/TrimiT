import CryptoJS from 'crypto-js';

const API_SIGNING_SECRET = process.env.EXPO_PUBLIC_API_SIGNING_SECRET;

/**
 * Generates a deterministic HMAC-SHA256 signature for an API request.
 * Matches backend SignatureMiddleware implementation.
 * 
 * Format: HMAC_SHA256(SECRET, "METHOD|PATH|TIMESTAMP")
 */
export const generateRequestSignature = async (
  method: string,
  path: string,
  _body: unknown, // Body not currently included in signature for simplicity/performance
  timestamp: string
): Promise<string | null> => {
  if (!API_SIGNING_SECRET) {
    if (__DEV__) {
      console.warn('[Security] EXPO_PUBLIC_API_SIGNING_SECRET is missing. API signing is disabled.');
    }
    return null;
  }

  const normalizedMethod = method.toUpperCase();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Format: METHOD|PATH|TIMESTAMP
  const payload = `${normalizedMethod}|${normalizedPath}|${timestamp}`;
  
  try {
    const hash = CryptoJS.HmacSHA256(payload, API_SIGNING_SECRET);
    return CryptoJS.enc.Hex.stringify(hash);
  } catch (err) {
    console.error('[Security] HMAC generation failed:', err);
    return null;
  }
};
