// Centralized phone validation + formatting for the web app.
//
// TrimiT currently operates in India only, so the default region is IN
// (+91, 10 national digits starting 6–9). Keeping this in one place means a
// future multi-region rollout only has to change/extend this config instead
// of editing every form. Mirrors the mobile app's phone rules.

export const PHONE_CONFIG = {
  IN: {
    dialCode: '+91',
    nationalLength: 10,
    // Indian mobile numbers start 6-9 followed by 9 more digits.
    nationalRegex: /^[6-9]\d{9}$/,
    example: '9876543210',
  },
};

export const DEFAULT_PHONE_REGION = 'IN';

const getRegion = (region = DEFAULT_PHONE_REGION) =>
  PHONE_CONFIG[region] || PHONE_CONFIG[DEFAULT_PHONE_REGION];

/** Strip everything except digits and clamp to the region's national length. */
export const sanitizePhoneInput = (value, region = DEFAULT_PHONE_REGION) => {
  const { nationalLength } = getRegion(region);
  return String(value || '')
    .replace(/[^0-9]/g, '')
    .slice(0, nationalLength);
};

/** True when the national-format number is valid for the region. */
export const isValidNationalPhone = (value, region = DEFAULT_PHONE_REGION) => {
  const { nationalRegex } = getRegion(region);
  return nationalRegex.test(String(value || '').trim());
};

/** Convert a national number to E.164-ish (dial code + national). */
export const toE164 = (value, region = DEFAULT_PHONE_REGION) => {
  const national = String(value || '').trim();
  if (!national) return undefined;
  const { dialCode } = getRegion(region);
  return `${dialCode}${national}`;
};

/** Human-readable validation hint for the region. */
export const phoneValidationHint = (region = DEFAULT_PHONE_REGION) => {
  const { nationalLength, example } = getRegion(region);
  return `Phone must be a valid ${nationalLength}-digit number (e.g. ${example}).`;
};

export const phoneDialCode = (region = DEFAULT_PHONE_REGION) =>
  getRegion(region).dialCode;
