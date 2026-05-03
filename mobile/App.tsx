import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Text, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';

import { lightPalette } from './src/theme/colors';
import { useTheme } from './src/theme/ThemeContext';
import { registerForPushNotificationsAsync, handleNotificationResponse } from './src/lib/notifications';
import RootNavigator, { navigationRef } from './src/navigation/index';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider } from './src/theme/ThemeContext';
import { logger } from './src/lib/logger';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import Toast from './src/components/Toast';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 60, // 1 hour stale time for offline support
      gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

persistQueryClient({
  queryClient: queryClient as any,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});

const CUSTOM_FONTS = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
};

import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "https://placeholder-dsn@sentry.io/123", 
  debug: __DEV__,
  tracesSampleRate: 1.0,
});

import { analytics } from './src/lib/analytics';

function AppContent() {
  const { isDark } = useTheme();
  const { isAuthenticated, initializeAuth, isHydrated, setQueryClient } = useAuthStore();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      await Font.loadAsync(CUSTOM_FONTS);
      setFontsLoaded(true);
    } catch (e) {
      console.warn('[App] Font loading failed:', e);
      setFontsLoaded(true); // Continue with system fonts
    }
  }, []);

  useEffect(() => {
    loadResources();
    initializeAuth();
    setQueryClient(queryClient as any);
    analytics.init();
  }, []);

  // Senior Architect: Track user identity in Sentry/Analytics when authenticated
  useEffect(() => {
    if (isAuthenticated && isHydrated) {
      const user = useAuthStore.getState().user;
      if (user) {
        logger.setUser(user.id, user.email, user.name);
        analytics.identify(user.id, { email: user.email, name: user.name });
      }
    } else {
      logger.clearUser();
    }
  }, [isAuthenticated, isHydrated]);

  // Register push notifications when user logs in
  useEffect(() => {
    // Only register if authenticated AND NOT in Expo Go (remote notifications not supported in Go SDK 53+)
    if (isAuthenticated && Constants.appOwnership !== 'expo') {
      registerForPushNotificationsAsync();

      // Listen for notification interactions
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        handleNotificationResponse(response, navigationRef);
      });

      return () => subscription.remove();
    }
  }, [isAuthenticated]);

  if (!isHydrated || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Image source={require('./assets/logo.png')} style={{ width: 40, height: 40, resizeMode: 'contain', tintColor: '#FFFFFF' }} />
        </View>
        <Text style={styles.splashTitle}>TrimiT</Text>
        <ActivityIndicator
          size="large"
          color={lightPalette.primary}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  // Safety check: Ensure all critical components are defined
  if (!ErrorBoundary || !RootNavigator || !Toast) {
    console.error('[App] Critical components missing. Check imports.');
    return (
      <View style={styles.splash}>
        <Text>Loading application modules...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <ErrorBoundary>
        <RootNavigator />
        <OfflineBanner />
        <Toast />
      </ErrorBoundary>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

// Splash uses light palette — it shows before theme hydrates from AsyncStorage
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: lightPalette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: lightPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashIcon: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: lightPalette.text,
  },
});
