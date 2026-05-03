import * as Sentry from '@sentry/react-native';

/**
 * logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized logging service that integrates with Sentry.
 * Use this instead of console.log/error for production-ready tracking.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  /**
   * Log an error to console and report to Sentry
   */
  error(message: string, error?: any, extra?: Record<string, any>) {
    console.error(`[ERROR] ${message}`, error);

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

  /**
   * Log a warning to console and add as breadcrumb to Sentry
   */
  warn(message: string, extra?: Record<string, any>) {
    console.warn(`[WARN] ${message}`, extra);

    Sentry.addBreadcrumb({
      category: 'log',
      message,
      level: 'warning',
      data: extra,
    });
  }

  /**
   * Log info to console and add as breadcrumb
   */
  info(message: string, extra?: Record<string, any>) {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, extra);
    }

    Sentry.addBreadcrumb({
      category: 'log',
      message,
      level: 'info',
      data: extra,
    });
  }

  /**
   * Set user context in Sentry for better debugging
   */
  setUser(id: string, email?: string, username?: string) {
    Sentry.setUser({ id, email, username });
  }

  /**
   * Clear user context (e.g. on logout)
   */
  clearUser() {
    Sentry.setUser(null);
  }
}

export const logger = new Logger();
