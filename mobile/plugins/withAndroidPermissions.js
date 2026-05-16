const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

/** Full android.permission.* names only — never suffix-match (POST_NOTIFICATIONS ends with NOTIFICATIONS). */
const BLOCKED_PERMISSIONS = new Set([
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.RECORD_AUDIO',
  'android.permission.USE_FINGERPRINT',
  'android.permission.USE_BIOMETRIC',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
]);

const REQUIRED_PERMISSIONS = ['android.permission.POST_NOTIFICATIONS'];

/**
 * Strips over-broad permissions merged from transitive dependencies (expo-av, etc.).
 * Ensures POST_NOTIFICATIONS remains for Android 13+ push delivery in release APKs.
 */
function withAndroidPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [manifest['uses-permission']];

    const filtered = permissions.filter((item) => {
      const name = item.$?.['android:name'] || item.$?.name || '';
      return !BLOCKED_PERMISSIONS.has(name);
    });

    const names = new Set(
      filtered.map((item) => item.$?.['android:name'] || item.$?.name || '').filter(Boolean)
    );

    for (const required of REQUIRED_PERMISSIONS) {
      if (!names.has(required)) {
        filtered.push({ $: { 'android:name': required } });
        names.add(required);
      }
    }

    manifest['uses-permission'] = filtered;

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$ = app.$ || {};
    app.$['android:enableOnBackInvokedCallback'] = 'true';

    return config;
  });
}

module.exports = withAndroidPermissions;
