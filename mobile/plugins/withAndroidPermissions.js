const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const BLOCKED_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.RECORD_AUDIO',
  'android.permission.USE_FINGERPRINT',
  'android.permission.USE_BIOMETRIC',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'NOTIFICATIONS',
];

/**
 * Strips over-broad permissions merged from transitive dependencies (expo-av, etc.).
 */
function withAndroidPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) {
      return config;
    }

    const permissions = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [manifest['uses-permission']];

    manifest['uses-permission'] = permissions.filter((item) => {
      const name = item.$?.['android:name'] || item.$?.name || '';
      return !BLOCKED_PERMISSIONS.some(
        (blocked) => name === blocked || name.endsWith(blocked.replace('android.permission.', ''))
      );
    });

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$ = app.$ || {};
    app.$['android:enableOnBackInvokedCallback'] = 'true';

    return config;
  });
}

module.exports = withAndroidPermissions;
