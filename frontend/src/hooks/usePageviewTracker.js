/**
 * Privacy-friendly page-view tracking for the web app.
 *
 * Fires POST /analytics/pageview on every route change (fire-and-forget). It
 * sends only a random, persisted session id (no identity), the path, and the
 * referrer. Failures are swallowed — tracking must NEVER block or break the UI.
 *
 * The founder-only /admin route is intentionally NOT tracked.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getEnv } from '../config/env';

const SID_KEY = 'trimit.sid';

function resolveApiBaseUrl() {
  const raw = getEnv('BACKEND_URL').trim().replace(/\/$/, '');
  if (!raw) return 'https://trimit-az5h.onrender.com/api/v1';
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api')) return `${raw}/v1`;
  return `${raw}/api/v1`;
}

function getSessionId() {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

export function usePageviewTracker() {
  const location = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    const path = location.pathname;
    // Never track the founder dashboard; skip duplicate fires for same path.
    if (path.startsWith('/admin')) return;
    if (lastPath.current === path) return;
    lastPath.current = path;

    const payload = {
      path,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      session_id: getSessionId() || undefined,
    };

    // Fire-and-forget. Prefer sendBeacon; fall back to fetch keepalive.
    try {
      const url = `${resolveApiBaseUrl()}/analytics/pageview`;
      const body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else if (typeof fetch !== 'undefined') {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* swallow — analytics must never break navigation */
    }
  }, [location.pathname]);
}

export default usePageviewTracker;
