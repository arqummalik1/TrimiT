import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import CustomerTabs from './CustomerTabs';
import OwnerTabs from './OwnerTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Exported for use in API interceptor (401 → navigate to auth)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore();
  const role = user?.role;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : role === 'owner' ? (
        <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      ) : (
        <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      )}
    </Stack.Navigator>
  );
}
