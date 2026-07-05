import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';


import { CustomerTabParamList, ProfileStackParamList } from './types';

import { useTheme } from '../theme/ThemeContext';
import { FloatingTabBar } from '../components/FloatingTabBar';

import CustomerStack from './CustomerStack';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import MyOffersScreen from '../screens/customer/MyOffersScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import ContactScreen from '../screens/legal/ContactScreen';
import PaymentsHelpScreen from '../screens/legal/PaymentsHelpScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

// Deep "flow" screens (booking funnel + detail views) where the floating tab bar
// must be hidden — they have their own bottom CTAs and the bar would overlap them.
// Hiding it here is the same pattern Zomato/Urban Company use: entering a flow
// removes the tabs; the header back button exits the flow.
const HIDDEN_TAB_BAR_ROUTES = new Set<string>([
  'SalonDetail',
  'ServiceDetail',
  'Booking',
  'RescheduleBooking',
  'PaymentWaiting',
  'WriteReview',
]);

function CustomerTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const activeTabRoute = state.routes[state.index];
  const nestedRouteName = getFocusedRouteNameFromRoute(activeTabRoute);
  if (nestedRouteName && HIDDEN_TAB_BAR_ROUTES.has(nestedRouteName)) {
    return null;
  }
  return <FloatingTabBar {...props} />;
}

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="MyOffers" component={MyOffersScreen} />
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
      tabBar={(props) => <CustomerTabBar {...props} />}
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
