import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OwnerTabParamList } from './types';
import { useTheme } from '../theme/ThemeContext';

import OwnerStack from './OwnerStack';
import ManageBookingsScreen from '../screens/owner/ManageBookingsScreen';
import ManageServicesScreen from '../screens/owner/ManageServicesScreen';
import SettingsScreen from '../screens/owner/SettingsScreen';
import ManageSalonScreen from '../screens/owner/ManageSalonScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import ContactScreen from '../screens/legal/ContactScreen';

const Tab = createBottomTabNavigator<OwnerTabParamList>();

// Settings needs its own stack so it can navigate to ManageSalon
const SettingsStack = createNativeStackNavigator();
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

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
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
  );
}
