// Dynamic Expo config — reads Google Maps key from env so it never lands in source.
// Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY locally (.env) and via EAS secrets for builds.

module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!mapsKey && process.env.NODE_ENV === 'production') {
    // Fail loud during production builds so we never ship without a real key.
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Set it via EAS secret before building.'
    );
  }

  return {
    ...config,
    expo: {
      name: 'TrimiT',
      slug: 'trimit',
      version: '1.0.0',
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
        adaptiveIcon: {
          foregroundImage: './assets/SquareLogo.png',
          backgroundColor: '#000000',
        },
        edgeToEdgeEnabled: true,
        permissions: [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.CAMERA',
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.NOTIFICATIONS',
          'android.permission.RECORD_AUDIO',
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
        'expo-font',
        'expo-notifications',
        'expo-location',
        'expo-image-picker',
        'expo-secure-store',
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
  };
};
