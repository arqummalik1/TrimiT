import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
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

import { colors } from './src/lib/utils';
import { registerForPushNotificationsAsync, handleNotificationResponse } from './src/lib/notifications';
import RootNavigator, { navigationRef } from './src/navigation/index';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider } from './src/theme/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
// import OfflineBanner from './src/components/OfflineBanner';
import Toast from './src/components/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
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

function AppContent() {
  const { isAuthenticated, initializeAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
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
    const timeout = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timeout);
  }, []);

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

  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashIcon}>✂</Text>
        </View>
        <Text style={styles.splashTitle}>TrimiT</Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
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
        {/* <OfflineBanner /> */}
        <Toast />
      </ErrorBoundary>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
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
    color: colors.text,
  },
});
