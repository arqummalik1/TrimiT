import { buildConfig } from './buildConfig';

let sentryInitialized = false;

function getSentry() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@sentry/react-native') as typeof import('@sentry/react-native');
}

/**
 * Initialize Sentry only in release builds, never during dev (avoids console noise).
 * Must not throw — a bad DSN or native module must not take down the app.
 */
export function initSentryIfNeeded(): boolean {
  if (__DEV__) {
    return false;
  }

  const dsn = buildConfig.sentryDsn;
  if (!dsn || sentryInitialized) {
    return sentryInitialized;
  }

  try {
    const Sentry = getSentry();
    Sentry.init({
      dsn,
      debug: false,
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
    });
    sentryInitialized = true;
    return true;
  } catch (error) {
    console.warn('[Sentry] init failed — continuing without crash reporting', error);
    return false;
  }
}

export function isSentryReady(): boolean {
  return sentryInitialized;
}

/** Call from App startup before any logger/Sentry usage in release. */
export function ensureSentry(): void {
  initSentryIfNeeded();
}
