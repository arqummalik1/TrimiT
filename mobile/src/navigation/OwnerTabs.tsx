import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { OwnerTabParamList, OwnerSettingsStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { salonRepository } from '../repositories/salonRepository';
import { bookingRepository } from '../repositories/bookingRepository';
import { useRealtimeBookings } from '../hooks/useRealtimeBookings';
import { useNotificationStore } from '../store/notificationStore';
import { BookingNotificationModal } from '../components/BookingNotificationModal';
import { 
  setupPushNotifications, 
  addNotificationReceivedListener, 
  addNotificationResponseListener,
  getLastNotificationResponse 
} from '../lib/notifications';

const devLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

// Configure notifications to show and play sound when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import OwnerStack from './OwnerStack';
import ManageBookingsScreen from '../screens/owner/ManageBookingsScreen';
import ManageServicesScreen from '../screens/owner/ManageServicesScreen';
import StaffManagementScreen from '../screens/owner/StaffManagementScreen';
import PromoManagementScreen from '../screens/owner/PromoManagementScreen';
import SettingsScreen from '../screens/owner/SettingsScreen';
import ManageSalonScreen from '../screens/owner/ManageSalonScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import ContactScreen from '../screens/legal/ContactScreen';

const Tab = createBottomTabNavigator<OwnerTabParamList>();

// Settings needs its own stack so it can navigate to ManageSalon, Staff, and Promos
const SettingsStack = createNativeStackNavigator<OwnerSettingsStackParamList>();
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="ManageSalon" component={ManageSalonScreen} />
      <SettingsStack.Screen name="StaffManagement" component={StaffManagementScreen} />
      <SettingsStack.Screen name="PromoManagement" component={PromoManagementScreen} />
      <SettingsStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <SettingsStack.Screen name="Terms" component={TermsScreen} />
      <SettingsStack.Screen name="Contact" component={ContactScreen} />
    </SettingsStack.Navigator>
  );
}

export default function OwnerTabs() {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  // Notification store
  const activeNotification = useNotificationStore((state) => state.activeNotification);
  const setActiveNotification = useNotificationStore((state) => state.setActiveNotification);
  const initializeSound = useNotificationStore((state) => state.initializeSound);
  const cleanupSound = useNotificationStore((state) => state.cleanupSound);

  // Fetch salon data
  const { data: salon } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: () => salonRepository.getOwnerSalon(),
    retry: false,
  });

  // Fetch analytics for badge count
  const { data: analytics } = useQuery({
    queryKey: ['ownerAnalytics', 'today', salon?.id],
    queryFn: () => salonRepository.getAnalytics('today'),
    enabled: !!salon,
    staleTime: 0,
  });

  // Mutation for booking status updates
  const statusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      bookingRepository.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      void Promise.all([
        queryClient.refetchQueries({ queryKey: ['ownerBookings'] }),
        queryClient.refetchQueries({ queryKey: ['recentBookings'] }),
        queryClient.refetchQueries({ queryKey: ['ownerAnalytics'] }),
      ]).catch(() => {});
    },
  });

  // Initialize notification sound and push notifications
  useEffect(() => {
    initializeSound();
    
    // Request notification permissions
    Notifications.requestPermissionsAsync();
    
    // Setup push notifications (safe - won't break if it fails)
    setupPushNotifications().catch((error) => {
      console.warn('[OwnerTabs] Push notification setup failed (non-critical):', error);
    });
    
    setIsReady(true);

    return () => {
      cleanupSound();
    };
  }, []);

  // Subscribe to real-time booking updates
  useRealtimeBookings({
    salonId: salon?.id,
    enabled: isReady && !!salon?.id,
    onNewBooking: (booking) => {
      devLog('[OwnerTabs] New booking received:', booking.id);
      // Notification is automatically added by the hook
    },
    onBookingUpdate: (booking) => {
      devLog('[OwnerTabs] Booking updated:', booking.id);
    },
    onBookingDelete: (bookingId) => {
      devLog('[OwnerTabs] Booking deleted:', bookingId);
    },
  });

  // When returning from background, refresh owner stats (Realtime can miss events while suspended).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !salon?.id) return;
      void Promise.all([
        queryClient.refetchQueries({ queryKey: ['ownerBookings'] }),
        queryClient.refetchQueries({ queryKey: ['recentBookings'] }),
        queryClient.refetchQueries({ queryKey: ['ownerAnalytics'] }),
      ]).catch(() => {});
    });
    return () => sub.remove();
  }, [queryClient, salon?.id]);

  const pendingCount = analytics?.pending_bookings || 0;

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: StyleSheet.hairlineWidth,
            // Dynamic height: base chrome (56) + system bottom inset.
            // This prevents clipping on Android gesture nav and iPhone home indicator.
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={OwnerStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Bookings"
          component={ManageBookingsScreen}
          options={{
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.error, color: '#fff' },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Services"
          component={ManageServicesScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pricetag" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsStackScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Booking Notification Modal */}
      <BookingNotificationModal
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
        onAccept={(bookingId) => {
          statusMutation.mutate({ bookingId, status: 'confirmed' });
        }}
        onReject={(bookingId) => {
          statusMutation.mutate({ bookingId, status: 'cancelled' });
        }}
        isProcessing={statusMutation.isPending}
      />
    </>
  );
}
