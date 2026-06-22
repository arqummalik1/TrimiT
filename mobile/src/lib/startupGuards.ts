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
      beforeSend: (event) => {
        const scrubText = (text: string) => {
          if (!text || typeof text !== 'string') return text;
          return text
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
            .replace(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, '[PHONE]')
            .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT]');
        };

        try {
          if (event.message) {
            event.message = scrubText(event.message);
          }
          if (event.breadcrumbs) {
            event.breadcrumbs.forEach((crumb) => {
              if (crumb.message) crumb.message = scrubText(crumb.message);
              if (crumb.data) {
                Object.keys(crumb.data).forEach(key => {
                  if (typeof crumb.data?.[key] === 'string') {
                    crumb.data[key] = scrubText(crumb.data[key] as string);
                  }
                });
              }
            });
          }
        } catch (e) {
          // Ignore scrubbing errors to ensure the event still sends
        }
        return event;
      },
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
