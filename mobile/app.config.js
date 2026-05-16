// Dynamic Expo config — reads Google Maps key from env so it never lands in source.
// Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY locally (.env) and via EAS secrets for builds.

const withAndroidPermissions = require('./plugins/withAndroidPermissions');

module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Don't fail in preview builds if Maps key is missing - just warn
  if (!mapsKey && process.env.NODE_ENV === 'production' && process.env.EAS_BUILD_PROFILE === 'production') {
    console.warn('⚠️ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Maps may not work properly.');
  }

  return withAndroidPermissions({
    ...config,
    expo: {
      name: 'TrimiT',
      slug: 'trimit',
      scheme: 'trimit',
      version: '1.0.0',
      runtimeVersion: {
        policy: 'appVersion',
      },
      orientation: 'portrait',
      icon: './assets/SquareLogo.png',
      userInterfaceStyle: 'automatic',
      newArchEnabled: true,
      splash: {
        image: './assets/SquareLogo.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
      ios: {
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
      plugins: [
        './plugins/withAndroidPermissions.js',
        'expo-font',
        'expo-notifications',
        'expo-location',
        'expo-image-picker',
        'expo-secure-store',
        [
          'expo-build-properties',
          {
            android: {
              enableMinifyInReleaseBuilds: true,
              enableShrinkResourcesInReleaseBuilds: true,
              extraProguardRules: [
                '-keep class com.facebook.react.** { *; }',
                '-keep class com.swmansion.reanimated.** { *; }',
                '-keep class com.razorpay.** { *; }',
              ].join('\n'),
            },
          },
        ],
        [
          '@sentry/react-native/expo',
          {
            organization: 'trimit-inc',
            project: 'trimit-mobile',
          },
        ],
      ],
      extra: {
        eas: {
          projectId: 'e4f2eade-fe15-4a16-8766-83b0771a4643',
        },
      },
      owner: 'arqummalik1',
    },
  });
};
