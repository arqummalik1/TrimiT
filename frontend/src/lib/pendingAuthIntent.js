const STORAGE_KEY = 'trimit-web-auth-intent-v1';
const INTENT_TTL_MS = 20 * 60 * 1000;

const SIMPLE_KINDS = new Set([
  'my_bookings',
  'profile',
  'account_deletion',
  'employee_claim',
]);

const OWNER_PATHS = new Set([
  '/owner/dashboard', '/owner/choose-type', '/owner/salon', '/owner/services',
  '/owner/categories', '/owner/bookings', '/owner/notifications', '/owner/settings',
  '/owner/subscription', '/owner/bank-account',
]);

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

export function isValidPendingAuthIntent(value) {
  if (!value || typeof value !== 'object') return false;
  if (!Number.isFinite(value.createdAt) || !Number.isFinite(value.expiresAt)) return false;
  if (value.expiresAt <= value.createdAt) return false;
  if (SIMPLE_KINDS.has(value.kind)) return true;
  if (value.kind === 'owner_onboarding') {
    return value.destination == null || OWNER_PATHS.has(value.destination);
  }
  if (value.kind === 'customer_booking') {
    return nonEmpty(value.salonId) && nonEmpty(value.serviceId);
  }
  return false;
}

function storage() {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

export function setPendingAuthIntent(intent) {
  const createdAt = Date.now();
  const next = { ...intent, createdAt, expiresAt: createdAt + INTENT_TTL_MS };
  if (!isValidPendingAuthIntent(next)) return null;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function peekPendingAuthIntent() {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!isValidPendingAuthIntent(parsed) || parsed.expiresAt <= Date.now()) {
      storage()?.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage()?.removeItem(STORAGE_KEY);
    return null;
  }
}

export function consumePendingAuthIntent() {
  const intent = peekPendingAuthIntent();
  storage()?.removeItem(STORAGE_KEY);
  return intent;
}

export function clearPendingAuthIntent() {
  storage()?.removeItem(STORAGE_KEY);
}

export function roleForPendingAuthIntent(intent = peekPendingAuthIntent()) {
  if (intent?.kind === 'employee_claim') return 'employee';
  return 'customer';
}

export function pathForPendingAuthIntent(intent) {
  if (!isValidPendingAuthIntent(intent)) return null;
  switch (intent.kind) {
    case 'customer_booking':
      return `/booking/${encodeURIComponent(intent.salonId)}/${encodeURIComponent(intent.serviceId)}`;
    case 'my_bookings':
      return '/my-bookings';
    case 'profile':
      return '/account';
    case 'account_deletion':
      return '/delete-account';
    case 'owner_onboarding':
      return intent.destination || '/owner/choose-type';
    case 'employee_claim':
      return '/employee-access';
    default:
      return null;
  }
}

export function intentForProtectedPath(pathname) {
  if (!nonEmpty(pathname)) return null;
  const booking = pathname.match(/^\/booking\/([^/]+)\/([^/]+)\/?$/);
  if (booking) {
    return {
      kind: 'customer_booking',
      salonId: decodeURIComponent(booking[1]),
      serviceId: decodeURIComponent(booking[2]),
    };
  }
  if (pathname === '/my-bookings') return { kind: 'my_bookings' };
  if (pathname === '/account') return { kind: 'profile' };
  if (pathname === '/delete-account') return { kind: 'account_deletion' };
  if (OWNER_PATHS.has(pathname)) return { kind: 'owner_onboarding', destination: pathname };
  if (pathname === '/employee-access') return { kind: 'employee_claim' };
  return null;
}

export function loginPathForIntent(intent) {
  const stored = setPendingAuthIntent(intent);
  const destination = stored ? pathForPendingAuthIntent(stored) : null;
  return destination ? `/login?redirect=${encodeURIComponent(destination)}` : '/login';
}
