import * as Sentry from '@sentry/react-native';

/**
 * Paused with App.tsx (no Sentry.init / no wrap). Set true and restore Sentry in App.tsx
 * to send breadcrumbs and exceptions again.
 */
const SENTRY_ENABLED = false;

/**
 * logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized logging. Console always; Sentry only when SENTRY_ENABLED is true.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  error(message: string, error?: unknown, extra?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, error);

    if (!SENTRY_ENABLED) {
      return;
    }

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
  }

  warn(message: string, extra?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, extra);

    if (!SENTRY_ENABLED) {
      return;
    }

    Sentry.addBreadcrumb({
      category: 'log',
      message,
      level: 'warning',
      data: extra,
    });
  }

  info(message: string, extra?: Record<string, unknown>) {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, extra);
    }

    if (!SENTRY_ENABLED) {
      return;
    }

    Sentry.addBreadcrumb({
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
    Sentry.setUser({ id, email, username });
  }

  clearUser() {
    if (!SENTRY_ENABLED) {
      return;
    }
    Sentry.setUser(null);
  }
}

export const logger = new Logger();
