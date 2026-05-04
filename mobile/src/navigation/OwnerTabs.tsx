import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { OwnerTabParamList, OwnerSettingsStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { subscribeToSalonBookings, unsubscribeFromBookings } from '../lib/supabase';
import api from '../lib/api';

// Configure notifications to show and play sound when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

// Settings needs its own stack so it can navigate to ManageSalon
const SettingsStack = createNativeStackNavigator<OwnerSettingsStackParamList>();
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="ManageSalon" component={ManageSalonScreen} />
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

  const { data: salon } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
    retry: false,
  });

  const { data: analytics } = useQuery({
    queryKey: ['ownerAnalytics', 'today', salon?.id],
    queryFn: async () => {
      const response = await api.get('/api/owner/analytics?period=today');
      return response.data;
    },
    enabled: !!salon,
  });

  useEffect(() => {
    if (!salon?.id) return;

    // Request permissions for notifications
    Notifications.requestPermissionsAsync();

    const channel = subscribeToSalonBookings(salon.id, (payload) => {
      // Invalidate queries so UI updates instantly across the app
      queryClient.invalidateQueries({ queryKey: ['ownerBookings'] });
      queryClient.invalidateQueries({ queryKey: ['ownerAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['recentBookings'] });

      // Trigger local notification on new booking
      if (payload.eventType === 'INSERT') {
        const newBooking = payload.new as any;
        Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 New Booking Received!',
            body: `${newBooking.service_name} on ${newBooking.booking_date} at ${newBooking.booking_time}`,
            sound: true, // Will play default notification sound
          },
          trigger: null, // Send immediately
        });
      }
    });

    return () => {
      unsubscribeFromBookings(channel);
    };
  }, [salon?.id, queryClient]);

  const pendingCount = analytics?.pending_bookings || 0;

  return (
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
        name="Staff"
        component={StaffManagementScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Promos"
        component={PromoManagementScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
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
  );
}
