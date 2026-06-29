import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/** Normalize slot / booking time to HH:MM (handles HH:MM:SS from DB). */
export function normalizeSlotTimeToHHMM(t) {
  if (t == null) return '';
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Structured error code from FastAPI error payloads (e.g. SUBSCRIPTION_REQUIRED). */
export function getApiErrorCode(err) {
  const detail = err?.response?.data?.detail;
  if (detail && typeof detail === 'object' && detail.code) return detail.code;
  return null;
}

/** Human-readable message from FastAPI / axios error payloads. */
export function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && detail.message) return detail.message;
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => d?.msg || d?.message).filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return fallback;
}

export function getStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getPaymentStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/** Allow only same-origin relative paths for post-login redirects. */
export function safeInternalPath(path) {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return null;
  }
  return trimmed;
}
