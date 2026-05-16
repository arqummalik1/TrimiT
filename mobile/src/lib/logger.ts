import { buildConfig } from './buildConfig';

/** Release builds only; init runs in App.tsx before errors are logged. */
const SENTRY_ENABLED = Boolean(buildConfig.sentryDsn) && !__DEV__;

function sentry() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@sentry/react-native') as typeof import('@sentry/react-native');
}

/**
 * logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized logging. `debug` / `info` are dev-only (no console noise in production).
 * `warn` / `error` always log to console; Sentry only when SENTRY_ENABLED is true.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  debug(message: string, extra?: Record<string, unknown>) {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, extra ?? '');
    }
  }

  error(message: string, error?: unknown, extra?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, error);

    if (!SENTRY_ENABLED) {
      return;
    }

    try {
      const Sentry = sentry();
      Sentry.withScope((scope) => {
        if (extra) {
          scope.setExtras(extra);
        }
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(`${message}: ${JSON.stringify(error)}`, 'error');
        }
      });
    } catch {
      // Sentry not ready — console.error above is enough
    }
  }

  warn(message: string, extra?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, extra);

    if (!SENTRY_ENABLED) {
      return;
    }

    sentry().addBreadcrumb({
      category: 'log',
      message,
      level: 'warning',
      data: extra,
    });
  }

  info(message: string, extra?: Record<string, unknown>) {
    if (!__DEV__) {
      return;
    }
    console.log(`[INFO] ${message}`, extra ?? '');

    if (!SENTRY_ENABLED) {
      return;
    }

    sentry().addBreadcrumb({
      category: 'log',
      message,
      level: 'info',
      data: extra,
    });
  }

  setUser(id: string, email?: string, username?: string) {
    if (!SENTRY_ENABLED) {
      return;
    }
    sentry().setUser({ id, email, username });
  }

  clearUser() {
    if (!SENTRY_ENABLED) {
      return;
    }
    sentry().setUser(null);
  }
}

export const logger = new Logger();
