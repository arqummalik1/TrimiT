import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Text, Image, InteractionManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
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
import RootNavigator, { navigationRef } from './src/navigation/index';
import { useAuthStore } from './src/store/authStore';
import { SessionExpiredModal } from './src/components/SessionExpiredModal';
import { SigningOutOverlay } from './src/components/SigningOutOverlay';
import { handleNotificationNavigation } from './src/lib/notificationNavigation';
import {
  getLastNotificationResponse,
  handleOwnerForegroundPush,
  setupPushNotifications,
} from './src/lib/notifications';
import { ThemeProvider } from './src/theme/ThemeContext';
import { logger } from './src/lib/logger';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import Toast from './src/components/Toast';
import { initSentryIfNeeded } from './src/lib/startupGuards';
import { analytics } from './src/lib/analytics';
import { getReleaseConfigIssues } from './src/lib/buildConfig';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
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

const configIssues = getReleaseConfigIssues();

const linking = {
  prefixes: ['trimit://', 'https://trimit.online'],
  config: {
    screens: {
      Auth: {
        path: '',
        screens: {
          ResetPassword: 'reset-password',
        },
      },
    },
  },
};

function AppContent() {
  const { isDark } = useTheme();
  const { isAuthenticated, isHydrated, authBootstrapComplete, setQueryClient, user } =
    useAuthStore();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  if (configIssues.length > 0) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>TrimiT</Text>
        <Text style={[styles.splashTitle, { fontSize: 16, marginTop: 16, fontWeight: '600' }]}>
          This build is missing configuration
        </Text>
        {configIssues.map((issue) => (
          <Text
            key={issue.key}
            style={{ marginTop: 8, color: lightPalette.textSecondary, textAlign: 'center', fontSize: 13 }}
          >
            • {issue.message}
          </Text>
        ))}
        <Text style={{ marginTop: 16, color: lightPalette.textSecondary, textAlign: 'center', fontSize: 12 }}>
          Rebuild with mobile/.env loaded: npm run build:apk:local
        </Text>
      </View>
    );
  }

  const loadResources = useCallback(async () => {
    try {
      await Font.loadAsync(CUSTOM_FONTS);
    } catch (e) {
      console.warn('[App] Font loading failed — using system fonts', e);
    } finally {
      setFontsLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        initSentryIfNeeded(); // release only; must not throw
        await loadResources();
        if (cancelled) return;

        setQueryClient(queryClient as never);
        analytics.init();

        InteractionManager.runAfterInteractions(() => {
          if (cancelled) return;
          try {
            persistQueryClient({
              queryClient: queryClient as never,
              persister: asyncStoragePersister,
              maxAge: 1000 * 60 * 60 * 24,
            });
          } catch (e) {
            console.warn('[App] Query cache persist skipped', e);
          }
        });
      } catch (e) {
        console.error('[App] Boot failed', e);
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : 'Startup failed');
          useAuthStore.getState().setHydrated(true);
          useAuthStore.setState({ authBootstrapComplete: true });
          setFontsLoaded(true);
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadResources, setQueryClient]);

  useEffect(() => {
    if (isAuthenticated && isHydrated) {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        logger.setUser(currentUser.id, currentUser.email, currentUser.name);
        analytics.identify(currentUser.id, { email: currentUser.email, name: currentUser.name });
      }
    } else {
      logger.clearUser();
    }
  }, [isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isAuthenticated || !authBootstrapComplete) {
      return;
    }

    void setupPushNotifications();

    const onResponse = async (response: Notifications.NotificationResponse) => {
      const reqId = response.notification.request.identifier;
      const lastHandled = await AsyncStorage.getItem('trimit_last_handled_notification_id');
      if (lastHandled === reqId) {
        return;
      }
      await AsyncStorage.setItem('trimit_last_handled_notification_id', reqId);
      const data = response.notification.request.content.data as Record<string, string | undefined>;
      handleNotificationNavigation(navigationRef.current, data, user?.role);
      await Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };

    const responseSub = Notifications.addNotificationResponseReceivedListener((r) => {
      void onResponse(r);
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      if (user?.role !== 'owner') {
        return;
      }
      void import('./src/lib/realtimeOwnerGuard').then(({ isOwnerRealtimeSubscribed }) => {
        if (!isOwnerRealtimeSubscribed()) {
          void handleOwnerForegroundPush(notification);
        }
      });
    });

    void getLastNotificationResponse().then((last) => {
      if (last) {
        void onResponse(last);
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [isAuthenticated, authBootstrapComplete, user?.role]);

  if (bootError) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>TrimiT</Text>
        <Text style={[styles.splashTitle, { fontSize: 14, marginTop: 12, fontWeight: '400' }]}>
          {bootError}
        </Text>
        <Text style={{ marginTop: 8, color: lightPalette.textSecondary, textAlign: 'center' }}>
          Try clearing app storage in Settings, then reopen.
        </Text>
      </View>
    );
  }

  if (!isHydrated || !authBootstrapComplete || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Image
            source={require('./assets/logo.png')}
            style={{ width: 40, height: 40, resizeMode: 'contain', tintColor: '#FFFFFF' }}
          />
        </View>
        <Text style={styles.splashTitle}>TrimiT</Text>
        <ActivityIndicator size="large" color={lightPalette.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <RootNavigator />
      <SigningOutOverlay />
      <SessionExpiredModal />
      <OfflineBanner />
      <Toast />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: lightPalette.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: lightPalette.text,
  },
});
