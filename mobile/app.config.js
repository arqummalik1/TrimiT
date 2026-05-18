// Dynamic Expo config — env from EAS dashboard, eas.json, or mobile/.env (local builds via scripts/load-env-for-build.sh).
// .env is gitignored and is NOT copied into EAS temp dirs — always load .env here when the file exists.

const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadDotEnv();

const appVersion = require('../shared/app-version.json');

const withAndroidPermissions = require('./plugins/withAndroidPermissions');

const releaseProguardRules = fs.readFileSync(
  path.join(__dirname, 'proguard-rules.pro'),
  'utf8'
);

const DEFAULT_API_URL = 'https://trimit-az5h.onrender.com';
const DEFAULT_SITE_URL = 'https://trimit.online';

function env(name, fallback = '') {
  const v = process.env[name];
  if (typeof v === 'string' && v.trim() && !v.startsWith('$')) {
    return v.trim();
  }
  return fallback;
}

module.exports = ({ config }) => {
  const isEasBuild = Boolean(process.env.EAS_BUILD);
  const profile = process.env.EAS_BUILD_PROFILE || '';
  const isReleaseProfile = profile === 'preview' || profile === 'production';

  const mapsKey = env('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  const supabaseUrl = env('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnon = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const sentryDsn = env('EXPO_PUBLIC_SENTRY_DSN');

  if (isEasBuild && isReleaseProfile) {
    const missing = [];
    if (!mapsKey) missing.push('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseAnon) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    if (missing.length > 0) {
      const hint =
        process.env.EAS_BUILD_LOCAL === '1' || process.env.EAS_LOCAL_BUILD === '1'
          ? 'Local: run npm run build:apk:local from mobile/ (loads .env into shell).'
          : 'Cloud: run ./scripts/push-expo-env.sh then eas env:list --environment production.';
      throw new Error(`[TrimiT] Release build missing: ${missing.join(', ')}.\n${hint}`);
    }
  }

  const plugins = [
    './plugins/withAndroidPermissions.js',
    'expo-asset',
    'expo-audio',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#000000',
        sounds: ['./assets/sounds/notification.mp3'],
      },
    ],
    'expo-location',
    'expo-image-picker',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: false,
          extraPropertiesGradle: {
            'org.gradle.jvmargs':
              '-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError',
            'org.gradle.daemon.performance.disable-logging': 'true',
          },
          extraProguardRules: releaseProguardRules,
        },
      },
    ],
  ];

  if (sentryDsn) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        url: 'https://de.sentry.io/',
        organization: 'trimit-inc',
        project: 'trimit-mobile',
      },
    ]);
  }

  return withAndroidPermissions({
    ...config,
    expo: {
      name: 'TrimiT',
      slug: 'trimit',
      scheme: 'trimit',
      version: appVersion.version,
      // Plain string avoids expo-updates appVersion policy warning (OTA not used in v1).
      runtimeVersion: appVersion.version,
      orientation: 'portrait',
      icon: './assets/SquareLogo.png',
      userInterfaceStyle: 'automatic',
      // New Arch off for release stability (avoids device-specific native crashes on some OEMs).
      newArchEnabled: false,
      splash: {
        image: './assets/SquareLogo.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
      ios: {
        buildNumber: appVersion.iosBuildNumber,
        supportsTablet: true,
        bundleIdentifier: 'com.trimit.app',
        infoPlist: {
          NSLocationWhenInUseUsageDescription: 'TrimiT uses your location to find nearby salons.',
          NSCameraUsageDescription: 'TrimiT uses the camera to take salon photos.',
          NSPhotoLibraryUsageDescription:
            'TrimiT accesses your photo library to upload salon images.',
        },
        config: {
          googleMapsApiKey: mapsKey,
        },
      },
      android: {
        versionCode: appVersion.androidVersionCode,
        package: 'com.trimit.app',
        notification: {
          icon: './assets/adaptive-icon.png',
          color: '#000000',
        },
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#000000',
        },
        edgeToEdgeEnabled: true,
        permissions: [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.CAMERA',
          'android.permission.READ_MEDIA_IMAGES',
          'android.permission.POST_NOTIFICATIONS',
        ],
        config: {
          googleMaps: {
            apiKey: mapsKey,
          },
        },
      },
      web: {
        favicon: './assets/SquareLogo.png',
      },
      plugins,
      extra: {
        eas: {
          projectId: 'e4f2eade-fe15-4a16-8766-83b0771a4643',
        },
        apiUrl: env('EXPO_PUBLIC_API_URL', DEFAULT_API_URL),
        supabaseUrl,
        supabaseAnonKey: supabaseAnon,
        googleMapsApiKey: mapsKey,
        publicSiteUrl: env('EXPO_PUBLIC_PUBLIC_SITE_URL', DEFAULT_SITE_URL),
        sentryDsn: sentryDsn || null,
        enableOnlinePay: env('EXPO_PUBLIC_ENABLE_ONLINE_PAY', 'false'),
      },
      owner: 'arqummalik1',
    },
  });
};
