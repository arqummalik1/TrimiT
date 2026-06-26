import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import { CustomerTabParamList, ProfileStackParamList } from './types';

import { useTheme } from '../theme/ThemeContext';
import { FloatingTabBar } from '../components/FloatingTabBar';

import CustomerStack from './CustomerStack';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import ContactScreen from '../screens/legal/ContactScreen';
import PaymentsHelpScreen from '../screens/legal/PaymentsHelpScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <ProfileStack.Screen name="Terms" component={TermsScreen} />
      <ProfileStack.Screen name="Contact" component={ContactScreen} />
      <ProfileStack.Screen name="PaymentsHelp" component={PaymentsHelpScreen} />
    </ProfileStack.Navigator>
  );
}

export default function CustomerTabs() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen
        name="Discover"
        component={CustomerStack}
      />
      <Tab.Screen
        name="Bookings"
        component={MyBookingsScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
      />
    </Tab.Navigator>
  );
}
