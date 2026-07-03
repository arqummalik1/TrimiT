const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Full android.permission.* names only — never suffix-match (POST_NOTIFICATIONS ends with NOTIFICATIONS).
 *
 * These are emitted into the app manifest as `tools:node="remove"` markers so
 * the Android manifest merger STRIPS them from the FINAL merged AAB — even when
 * a transitive library (expo-image-picker, expo-av, etc.) declares them in its
 * own manifest. Plain array filtering is NOT enough: the merger re-adds
 * library-declared permissions after config plugins run.
 *
 * READ_MEDIA_IMAGES / READ_MEDIA_VIDEO are restricted by Google Play's Photo
 * and Video Permissions policy. Salon image upload uses the Android Photo
 * Picker (launchImageLibraryAsync), which needs NO permission, so these must
 * never appear in the shipped manifest.
 */
const BLOCKED_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.RECORD_AUDIO',
  'android.permission.USE_FINGERPRINT',
  'android.permission.USE_BIOMETRIC',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.ACCESS_MEDIA_LOCATION',
];

const REQUIRED_PERMISSIONS = ['android.permission.POST_NOTIFICATIONS'];

/**
 * Strips over-broad / restricted permissions merged from transitive
 * dependencies and guarantees they are absent from the final AAB.
 * Ensures POST_NOTIFICATIONS remains for Android 13+ push delivery.
 */
function withAndroidPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure the tools namespace exists so tools:node="remove" is valid.
    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    let permissions = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [manifest['uses-permission']];

    const blocked = new Set(BLOCKED_PERMISSIONS);

    // Drop any existing declarations of blocked perms; re-add them below as
    // explicit removal markers.
    permissions = permissions.filter((item) => {
      const name = item.$?.['android:name'] || item.$?.name || '';
      return !blocked.has(name);
    });

    // Force the manifest merger to remove these from the final merged manifest.
    for (const name of BLOCKED_PERMISSIONS) {
      permissions.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    }

    const names = new Set(
      permissions
        .map((item) => item.$?.['android:name'] || item.$?.name || '')
        .filter(Boolean)
    );

    for (const required of REQUIRED_PERMISSIONS) {
      if (!names.has(required)) {
        permissions.push({ $: { 'android:name': required } });
        names.add(required);
      }
    }

    manifest['uses-permission'] = permissions;

    // ── UPI package visibility (Android 11+ package-visibility rules) ─────────
    // Without these <queries>, Linking.canOpenURL() for specific UPI apps and
    // package-targeted intents return false on Android 11+, so the in-app UPI
    // app picker can't detect or launch GPay/PhonePe/Paytm/BHIM individually.
    const UPI_PACKAGES = [
      'com.google.android.apps.nbu.paisa.user', // Google Pay
      'com.phonepe.app',                        // PhonePe
      'net.one97.paytm',                        // Paytm
      'in.org.npci.upiapp',                     // BHIM
      'com.whatsapp',                           // WhatsApp Pay
      'com.amazon.mShop.android.shopping',      // Amazon Pay
      'com.dreamplug.androidapp',               // CRED
    ];

    manifest.queries = Array.isArray(manifest.queries)
      ? manifest.queries
      : manifest.queries
        ? [manifest.queries]
        : [];

    // General visibility: any app that handles the `upi://` VIEW intent.
    const upiIntentQuery = {
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': 'upi' } }],
        },
      ],
    };

    // Explicit per-package visibility so canOpenURL detects each UPI app.
    const packageEntries = UPI_PACKAGES.map((pkg) => ({
      $: { 'android:name': pkg },
    }));

    manifest.queries.push(upiIntentQuery);
    manifest.queries.push({ package: packageEntries });

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$ = app.$ || {};
    // MUST stay 'false'. On old architecture + react-native-screens 4.x, Android
    // 13+ predictive back (enableOnBackInvokedCallback="true") is NOT consumed by
    // React Navigation, so every swipe-back/gesture back closes the app instead
    // of popping the screen. Setting it false restores the legacy BackHandler
    // path that React Navigation intercepts reliably. Do not flip to 'true'
    // until the app is on the New Architecture and back nav is verified.
    app.$['android:enableOnBackInvokedCallback'] = 'false';

    return config;
  });
}

module.exports = withAndroidPermissions;
