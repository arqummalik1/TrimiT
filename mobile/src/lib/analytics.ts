/**
 * analytics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper for event tracking. 
 * Decouples the app from specific SDKs (PostHog, Segment, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// import PostHog from 'posthog-react-native'; // Placeholder for future use

export type AnalyticsEvent = 
  | 'app_open'
  | 'signup_completed'
  | 'login_completed'
  | 'salon_searched'
  | 'salon_viewed'
  | 'booking_started'
  | 'booking_confirmed'
  | 'payment_failed'
  | 'review_submitted';

interface EventProperties {
  [key: string]: any;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  init() {
    if (this.isInitialized) return;
    // PostHog.init('YOUR_API_KEY', { host: 'https://app.posthog.com' });
    this.isInitialized = true;
    this.track('app_open');
  }

  track(event: AnalyticsEvent, properties?: EventProperties) {
    if (__DEV__) {
      console.log(`[Analytics] Track: ${event}`, properties);
    }
    
    // if (this.isInitialized) {
    //   PostHog.capture(event, properties);
    // }
  }

  identify(userId: string, traits?: EventProperties) {
    if (__DEV__) {
      console.log(`[Analytics] Identify: ${userId}`, traits);
    }
    
    // if (this.isInitialized) {
    //   PostHog.identify(userId, traits);
    // }
  }

  reset() {
    // if (this.isInitialized) {
    //   PostHog.reset();
    // }
  }
}

export const analytics = AnalyticsService.getInstance();
