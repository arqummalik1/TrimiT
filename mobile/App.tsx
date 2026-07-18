import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  StyleSheet,
  Text,
  InteractionManager,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";

import { useTheme } from "./src/theme/ThemeContext";
import RootNavigator, { navigationRef } from "./src/navigation/index";
import { useAuthStore } from "./src/store/authStore";
import { SessionExpiredModal } from "./src/components/SessionExpiredModal";
import { SigningOutOverlay } from "./src/components/SigningOutOverlay";
import { handleNotificationNavigation } from "./src/lib/notificationNavigation";
import { handleOwnerNotificationAction, toastForOwnerNotificationAction } from "./src/lib/notificationActions";
import {
  getLastNotificationResponse,
  handleOwnerForegroundPush,
  registerOwnerNotificationCategories,
  setupPushNotifications,
} from "./src/lib/notifications";
import { showToast } from "./src/store/toastStore";
import { ThemeProvider } from "./src/theme/ThemeContext";
import { logger } from "./src/lib/logger";
import { waitUntilForegroundLocationPermissionResolved } from "./src/lib/locationPermission";
import ErrorBoundary from "./src/components/ErrorBoundary";
import OfflineBanner from "./src/components/OfflineBanner";
import Toast from "./src/components/Toast";
import { PermissionPrimer } from "./src/components/PermissionPrimer";
import { initSentryIfNeeded } from "./src/lib/startupGuards";
import { analytics } from "./src/lib/analytics";
import { getReleaseConfigIssues } from "./src/lib/buildConfig";
import { AppSplashScreen } from "./src/components/AppSplashScreen";
import { useSplashGate } from "./src/hooks/useSplashGate";
import { SPLASH_BACKGROUND } from "./src/lib/splashBranding";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

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
const NOTIFICATION_PRIMER_DISMISSED_KEY =
  "trimit_notification_primer_dismissed_v1";

const linking = {
  prefixes: ["trimit://", "https://trimit.online"],
  config: {
    screens: {
      Auth: {
        path: "",
        screens: {
          ResetPassword: "reset-password",
        },
      },
    },
  },
};

function AppContent() {
  const { isDark } = useTheme();
  const {
    isAuthenticated,
    isHydrated,
    authBootstrapComplete,
    setQueryClient,
    user,
  } = useAuthStore();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [showNotificationPrimer, setShowNotificationPrimer] = useState(false);

  const bootComplete = isHydrated && authBootstrapComplete && fontsLoaded;
  const splashReadyToDismiss =
    configIssues.length > 0 || bootError != null || bootComplete;
  const splashDismissed = useSplashGate(splashReadyToDismiss);

  const loadResources = useCallback(async () => {
    try {
      await Font.loadAsync(CUSTOM_FONTS);
    } catch (e) {
      console.warn("[App] Font loading failed — using system fonts", e);
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
            console.warn("[App] Query cache persist skipped", e);
          }
        });
      } catch (e) {
        console.error("[App] Boot failed", e);
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : "Startup failed");
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
        analytics.identify(currentUser.id, {
          email: currentUser.email,
          name: currentUser.name,
        });
      }
    } else {
      logger.clearUser();
    }
  }, [isAuthenticated, isHydrated]);

  useEffect(() => {
    if (!isAuthenticated || !authBootstrapComplete) {
      return;
    }

    let cancelled = false;
    const abort = new AbortController();

    void registerOwnerNotificationCategories();

    void (async () => {
      try {
        const perms = await Notifications.getPermissionsAsync();
        if (cancelled) {
          return;
        }
        if (perms.status === "granted") {
          const setup = await setupPushNotifications();
          if (cancelled) {
            return;
          }
          if (!setup.ok && setup.reason === "android_fcm_or_permission") {
            showToast(
              "Android push is not ready (FCM). Booking alerts need a rebuild with google-services.json + EAS FCM key.",
              "error",
            );
          } else if (!setup.ok && setup.reason === "backend_sync_failed") {
            showToast("Could not sync push token. Check network and try Settings → Notifications.", "error");
          }
          return;
        }
        if (perms.status === "denied" && perms.canAskAgain === false) {
          return;
        }
        const dismissed = await AsyncStorage.getItem(
          NOTIFICATION_PRIMER_DISMISSED_KEY,
        );
        if (cancelled || dismissed === "true") {
          return;
        }
        // Customer Discover may show the OS location sheet on first open —
        // wait briefly so notification PermissionPrimer does not stack (iOS freeze).
        // If location was never requested, max wait is short (not 2 minutes).
        const role = useAuthStore.getState().user?.role;
        if (role === "customer") {
          try {
            await waitUntilForegroundLocationPermissionResolved({
              signal: abort.signal,
            });
          } catch (e) {
            if ((e as { name?: string })?.name === "AbortError") {
              return;
            }
            throw e;
          }
        }
        if (cancelled) {
          return;
        }
        setShowNotificationPrimer(true);
      } catch (e) {
        if (!cancelled) {
          logger.warn("[Notifications] Primer check failed", { error: e });
        }
      }
    })();

    const onResponse = async (response: Notifications.NotificationResponse) => {
      const reqId = response.notification.request.identifier;
      const actionKey = `${reqId}:${response.actionIdentifier ?? "default"}`;
      const lastHandled = await AsyncStorage.getItem(
        "trimit_last_handled_notification_id",
      );
      if (lastHandled === actionKey) {
        return;
      }
      const data = response.notification.request.content.data as Record<
        string,
        string | undefined
      >;

      if (user?.role === "owner" || user?.role === "employee") {
        const actionResult = await handleOwnerNotificationAction(
          response.actionIdentifier,
          data,
        );
        if (actionResult.handled) {
          const toast = toastForOwnerNotificationAction(
            actionResult.action,
            actionResult.ok,
          );
          showToast(toast.message, toast.type);
          // Only mark handled after success so failed Accept/Reject/Verify can retry.
          if (actionResult.ok) {
            await AsyncStorage.setItem(
              "trimit_last_handled_notification_id",
              actionKey,
            );
          }
          handleNotificationNavigation(navigationRef.current, data, user?.role);
          await Notifications.clearLastNotificationResponseAsync().catch(() => {});
          return;
        }
      }

      // Default tap / soft navigation — dedupe so cold-start listeners don't double-nav.
      await AsyncStorage.setItem("trimit_last_handled_notification_id", actionKey);
      handleNotificationNavigation(navigationRef.current, data, user?.role);
      await Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (r) => {
        void onResponse(r);
      },
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (user?.role !== "owner") {
          return;
        }
        void import("./src/lib/realtimeOwnerGuard").then(
          ({ isOwnerRealtimeSubscribed }) => {
            if (!isOwnerRealtimeSubscribed()) {
              void handleOwnerForegroundPush(notification);
            }
          },
        );
      },
    );

    void getLastNotificationResponse().then((last) => {
      if (last) {
        void onResponse(last);
      }
    });

    return () => {
      cancelled = true;
      abort.abort();
      responseSub.remove();
      receivedSub.remove();
    };
  }, [isAuthenticated, authBootstrapComplete, user?.role]);

  const handleAllowNotifications = useCallback(() => {
    setShowNotificationPrimer(false);
    void AsyncStorage.setItem(NOTIFICATION_PRIMER_DISMISSED_KEY, "true");
    void setupPushNotifications();
  }, []);

  const handleDenyNotifications = useCallback(() => {
    setShowNotificationPrimer(false);
    void AsyncStorage.setItem(NOTIFICATION_PRIMER_DISMISSED_KEY, "true");
  }, []);

  if (!splashDismissed) {
    return null;
  }

  if (configIssues.length > 0) {
    return (
      <View style={styles.configErrorRoot}>
        <AppSplashScreen
          message="This build is missing configuration"
          details={configIssues.map((issue) => issue.message)}
        />
        <Text style={styles.configErrorHint}>
          Rebuild with mobile/.env loaded: npm run build:apk:local
        </Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <AppSplashScreen
        message={bootError}
        details={["Try clearing app storage in Settings, then reopen."]}
      />
    );
  }

  if (!bootComplete) {
    return <AppSplashScreen showSpinner />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <RootNavigator />
      <SigningOutOverlay />
      <SessionExpiredModal />
      <OfflineBanner />
      <Toast />
      <PermissionPrimer
        isVisible={showNotificationPrimer}
        title="Stay updated on bookings"
        message="TrimiT sends booking confirmations, cancellations, reminders, and owner alerts. You can change this later in Settings."
        icon="notifications-outline"
        onAllow={handleAllowNotifications}
        onDeny={handleDenyNotifications}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
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
  configErrorRoot: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
  },
  configErrorHint: {
    position: "absolute",
    bottom: 48,
    left: 24,
    right: 24,
    fontSize: 12,
    color: "#78716C",
    textAlign: "center",
  },
});
