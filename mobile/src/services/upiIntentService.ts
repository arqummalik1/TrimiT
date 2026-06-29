import { Linking, Platform } from 'react-native';
import { logger } from '../lib/logger';

/**
 * upiIntentService — the single place that launches a UPI app via a deep link.
 * ─────────────────────────────────────────────────────────────────────────────
 * The customer pays the salon's UPI ID directly through their own UPI app
 * (Google Pay / PhonePe / Paytm / BHIM / WhatsApp Pay).
 *
 * Android behaviour:
 *   We use an Android Intent chooser URL (`intent://pay?...#Intent;...`) which
 *   pops up the system app-picker showing EVERY installed UPI app, instead of
 *   silently opening whichever one is set as the default handler.
 *
 * `launchUpiApp` resolves `{ launched }`:
 *   • launched: true  — the system chooser (or a UPI app) was opened.
 *   • launched: false — no UPI app could handle the intent. The caller shows
 *                       the salon UPI ID for manual payment.
 *
 * This never throws — failures resolve to `{ launched: false }`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface LaunchUpiResult {
  launched: boolean;
}

/** A UPI app that may be installed on the device. */
export interface UpiApp {
  /** Stable id used by the UI. */
  key: string;
  /** Display name. */
  name: string;
  /** Android package name (used to target the intent at this app). */
  androidPackage: string;
}

/**
 * The major UPI apps in India, in the order we want to show them.
 * `BHIM` is the NPCI reference app; the rest cover ~95% of UPI usage.
 */
export const KNOWN_UPI_APPS: UpiApp[] = [
  { key: 'gpay', name: 'Google Pay', androidPackage: 'com.google.android.apps.nbu.paisa.user' },
  { key: 'phonepe', name: 'PhonePe', androidPackage: 'com.phonepe.app' },
  { key: 'paytm', name: 'Paytm', androidPackage: 'net.one97.paytm' },
  { key: 'whatsapp', name: 'WhatsApp', androidPackage: 'com.whatsapp' },
  { key: 'bhim', name: 'BHIM', androidPackage: 'in.org.npci.upiapp' },
  { key: 'amazonpay', name: 'Amazon Pay', androidPackage: 'com.amazon.mShop.android.shopping' },
  { key: 'cred', name: 'CRED', androidPackage: 'com.dreamplug.androidapp' },
];

/**
 * Build an Android Intent chooser URL from a standard `upi://pay?...` URI.
 *
 * Using the `intent://` scheme instead of `upi://` forces Android to show the
 * app-picker (ACTION_VIEW + chooser) rather than opening the default UPI app.
 * Works on all UPI apps: Google Pay, PhonePe, Paytm, BHIM, WhatsApp Pay.
 *
 * Spec: https://developer.android.com/reference/android/content/Intent#toUri
 */
function buildAndroidIntentUri(upiIntentUri: string): string {
  // Strip the `upi://` scheme prefix to get the path+query
  // e.g. "upi://pay?pa=salon@upi&pn=Salon&am=100.00&cu=INR&tn=TrimiT+TRM-2026-XXXX"
  // becomes "pay?pa=salon@upi&pn=Salon&am=100.00&cu=INR&tn=TrimiT+TRM-2026-XXXX"
  const withoutScheme = upiIntentUri.replace(/^upi:\/\//, '');

  // Build the Android Intent URI:
  // intent://<path+query>#Intent;scheme=upi;action=android.intent.action.VIEW;
  //   category=android.intent.category.DEFAULT;
  //   category=android.intent.category.BROWSABLE;end
  return (
    `intent://${withoutScheme}` +
    `#Intent;scheme=upi;action=android.intent.action.VIEW;` +
    `category=android.intent.category.DEFAULT;` +
    `category=android.intent.category.BROWSABLE;end`
  );
}

/**
 * Build an Android Intent URI targeted at ONE specific UPI app by package.
 * This opens the chosen app directly (no system chooser).
 */
function buildPackageIntentUri(upiIntentUri: string, androidPackage: string): string {
  const withoutScheme = upiIntentUri.replace(/^upi:\/\//, '');
  return (
    `intent://${withoutScheme}` +
    `#Intent;scheme=upi;action=android.intent.action.VIEW;` +
    `package=${androidPackage};end`
  );
}

export const upiIntentService = {
  /**
   * Return the subset of KNOWN_UPI_APPS that are actually installed on this
   * device. Android-only meaningful; on iOS returns [] (uses generic launch).
   *
   * Detection uses `Linking.canOpenURL` against each app's package-targeted
   * intent. Requires the packages to be declared in the manifest <queries>
   * (see plugins/withAndroidPermissions.js) on Android 11+.
   */
  async getInstalledUpiApps(sampleUpiUri: string): Promise<UpiApp[]> {
    if (Platform.OS !== 'android') return [];

    const checks = await Promise.all(
      KNOWN_UPI_APPS.map(async (app) => {
        const uri = buildPackageIntentUri(sampleUpiUri, app.androidPackage);
        const ok = await Linking.canOpenURL(uri).catch(() => false);
        return ok ? app : null;
      })
    );
    return checks.filter((a): a is UpiApp => a !== null);
  },

  /**
   * Launch a SPECIFIC UPI app (by package) with the payment intent.
   * Falls back to the generic launcher if the targeted launch fails.
   */
  async launchUpiAppByPackage(
    intentUri: string,
    androidPackage: string
  ): Promise<LaunchUpiResult> {
    if (!intentUri) return { launched: false };

    if (Platform.OS === 'android') {
      const targeted = buildPackageIntentUri(intentUri, androidPackage);
      try {
        await Linking.openURL(targeted);
        return { launched: true };
      } catch (error) {
        logger.warn('[upiIntentService] package launch failed, falling back', {
          androidPackage,
          message: error instanceof Error ? error.message : String(error),
        });
        // fall through to generic launch
      }
    }
    return upiIntentService.launchUpiApp(intentUri);
  },

  async launchUpiApp(intentUri: string): Promise<LaunchUpiResult> {
    if (!intentUri || typeof intentUri !== 'string') {
      logger.warn('[upiIntentService] launchUpiApp called with empty intentUri');
      return { launched: false };
    }

    try {
      // On Android, use the Intent chooser so the system shows ALL installed
      // UPI apps (GPay, PhonePe, Paytm, WhatsApp Pay, BHIM, etc.) instead of
      // silently opening only the default handler.
      const urlToOpen =
        Platform.OS === 'android' ? buildAndroidIntentUri(intentUri) : intentUri;

      logger.debug('[upiIntentService] launching', {
        platform: Platform.OS,
        url: urlToOpen,
      });

      const canOpen = await Linking.canOpenURL(urlToOpen).catch(() => false);

      if (!canOpen) {
        logger.info('[upiIntentService] canOpenURL=false, trying openURL anyway');
        // Some OEMs report canOpenURL=false for intent:// even when UPI apps exist.
        try {
          await Linking.openURL(urlToOpen);
          return { launched: true };
        } catch {
          // Last resort: try the raw upi:// URI
          try {
            await Linking.openURL(intentUri);
            return { launched: true };
          } catch {
            return { launched: false };
          }
        }
      }

      await Linking.openURL(urlToOpen);
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
