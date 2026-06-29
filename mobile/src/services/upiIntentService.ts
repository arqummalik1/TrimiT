import { Linking } from 'react-native';
import { logger } from '../lib/logger';

/**
 * upiIntentService — the single place that launches a UPI app via a deep link.
 * ─────────────────────────────────────────────────────────────────────────────
 * The customer pays the salon's UPI ID directly through their own UPI app
 * (Google Pay / PhonePe / Paytm / BHIM). This service wraps `Linking` so the
 * UI and ViewModels never call `Linking` directly.
 *
 * `launchUpiApp` resolves `{ launched }`:
 *   • launched: true  — a UPI app was opened.
 *   • launched: false — no UPI app could handle the intent (or it failed). The
 *                       caller should then show the salon's UPI ID so the
 *                       customer can pay manually.
 *
 * This never throws — failures resolve to `{ launched: false }` so the booking
 * flow can always fall back gracefully.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface LaunchUpiResult {
  launched: boolean;
}

export const upiIntentService = {
  async launchUpiApp(intentUri: string): Promise<LaunchUpiResult> {
    if (!intentUri || typeof intentUri !== 'string') {
      logger.warn('[upiIntentService] launchUpiApp called with empty intentUri');
      return { launched: false };
    }

    try {
      // `canOpenURL` for the `upi:` scheme is unreliable on some Android setups,
      // so we attempt to open and treat a thrown error as "no app available".
      const canOpen = await Linking.canOpenURL(intentUri).catch(() => false);
      if (!canOpen) {
        logger.info('[upiIntentService] no UPI app can handle intent', {
          scheme: intentUri.split(':')[0],
        });
        // Still try openURL once — some OEMs report canOpenURL=false yet open fine.
        try {
          await Linking.openURL(intentUri);
          return { launched: true };
        } catch {
          return { launched: false };
        }
      }

      await Linking.openURL(intentUri);
      return { launched: true };
    } catch (error: unknown) {
      logger.warn('[upiIntentService] launchUpiApp failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return { launched: false };
    }
  },
};

export default upiIntentService;
