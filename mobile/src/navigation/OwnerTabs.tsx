import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerTabParamList, OwnerSettingsStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { salonRepository } from '../repositories/salonRepository';
import { queryKeys } from '../lib/queryKeys';
import { resetOwnerDashboardToMain } from '../lib/ownerNavigation';
import { bookingRepository } from '../repositories/bookingRepository';
import { useRealtimeBookings } from '../hooks/useRealtimeBookings';
import { useNotificationStore } from '../store/notificationStore';
import { BookingNotificationModal } from '../components/BookingNotificationModal';
import { SubscriptionGate } from '../components/SubscriptionGate';

const devLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

import OwnerStack from './OwnerStack';
import ManageBookingsScreen from '../screens/owner/ManageBookingsScreen';
import ManageServicesScreen from '../screens/owner/ManageServicesScreen';
import StaffManagementScreen from '../screens/owner/StaffManagementScreen';
import PromoManagementScreen from '../screens/owner/PromoManagementScreen';
import SettingsScreen from '../screens/owner/SettingsScreen';
import ManageSalonScreen from '../screens/owner/ManageSalonScreen';
import SubscriptionScreen from '../screens/owner/SubscriptionScreen';
import SubscriptionCheckoutScreen from '../screens/owner/SubscriptionCheckoutScreen';
import PaymentHistoryScreen from '../screens/owner/PaymentHistoryScreen';
import { BankAccountScreen } from '../screens/owner/BankAccountScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import ContactScreen from '../screens/legal/ContactScreen';
import BankDetailsScreen from '../screens/owner/BankDetailsScreen';

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
      <SettingsStack.Screen name="Subscription" component={SubscriptionScreen} />
      <SettingsStack.Screen name="SubscriptionCheckout" component={SubscriptionCheckoutScreen} />
      <SettingsStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <SettingsStack.Screen name="BankAccount" component={BankAccountScreen} />
      <SettingsStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <SettingsStack.Screen name="Terms" component={TermsScreen} />
      <SettingsStack.Screen name="Contact" component={ContactScreen} />
      <SettingsStack.Screen name="BankDetails" component={BankDetailsScreen} />
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
    queryKey: queryKeys.ownerSalon,
    queryFn: () => salonRepository.getOwnerSalon(),
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
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
      ]).catch(() => { });
    },
  });

  useEffect(() => {
    initializeSound();
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

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      if (!salon?.id) return;
      void Promise.all([
        queryClient.refetchQueries({ queryKey: ['ownerBookings'] }),
        queryClient.refetchQueries({ queryKey: ['recentBookings'] }),
        queryClient.refetchQueries({ queryKey: ['ownerAnalytics'] }),
      ]).catch(() => { });
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
          tabBarStyle: undefined,
          // Custom floating glass tab bar — see FloatingTabBar.tsx
        }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tab.Screen
          name="Dashboard"
          component={OwnerStack}
          listeners={({ navigation }) => ({
            tabPress: () => {
              if (salon?.id) {
                resetOwnerDashboardToMain(navigation);
              }
            },
          })}
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
          listeners={({ navigation: tabNav }) => ({
            // Always open the Settings tab at its menu (SettingsMain), never
            // parked on a deep screen like Subscription that was opened from the
            // dashboard. This guarantees a tap on Settings shows Settings.
            tabPress: () => {
              tabNav.navigate('Settings', { screen: 'SettingsMain' });
            },
          })}
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

      {/* Phase 2: full-screen freeze when subscription is inactive (no-op in Phase 1) */}
      <SubscriptionGate />
    </>
  );
}
