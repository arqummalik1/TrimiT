import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from './types';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import AuthStack from './AuthStack';
import CustomerTabs from './CustomerTabs';
import OwnerTabs from './OwnerTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Exported for notification deep links; auth remounts root stack on 401 via authStore.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, profileComplete, user, isOnboardingCompleted, isHydrated } = useAuthStore();
  const role = user?.role;

  // Wait until rehydration completes to prevent a flash of the onboarding screen on launch
  if (!isHydrated) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isOnboardingCompleted ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : !profileComplete ? (
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      ) : role === 'owner' || role === 'employee' ? (
        <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      ) : (
        <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      )}
    </Stack.Navigator>
  );
}
