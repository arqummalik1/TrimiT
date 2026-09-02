import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from './types';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import AuthStack from './AuthStack';
import CustomerTabs from './CustomerTabs';
import OwnerTabs from './OwnerTabs';
import { usePendingAuthIntentStore } from '../store/pendingAuthIntentStore';
import { navigationRef } from './navigationRef';
import {
  AUTH_MODAL_OPTIONS,
  buildPostAuthRootAction,
  getPostAuthDestination,
} from './postAuthNavigation';
import { logger } from '../lib/logger';
export { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

function getRootRouteName(): keyof RootStackParamList | undefined {
  if (!navigationRef.isReady()) return undefined;
  const state = navigationRef.getRootState();
  return state.routes[state.index]?.name as keyof RootStackParamList | undefined;
}

function PostAuthIntentCoordinator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileComplete = useAuthStore((state) => state.profileComplete);
  const user = useAuthStore((state) => state.user);
  const intent = usePendingAuthIntentStore((state) => state.intent);
  const intentHydrated = usePendingAuthIntentStore((state) => state.isHydrated);
  const activatingRoleRef = useRef(false);

  useEffect(() => {
    if (!navigationRef.isReady() || !intentHydrated) return;

    const current = usePendingAuthIntentStore.getState().peekIntent();
    if (!isAuthenticated) {
      if (current && getRootRouteName() !== 'Auth') {
        navigationRef.navigate('Auth', { screen: 'Login' });
      } else if (!current && getRootRouteName() === 'OwnerTabs') {
        navigationRef.navigate('CustomerTabs');
      }
      return;
    }

    if (!profileComplete || !user) {
      if (current?.kind === 'employee_claim' && getRootRouteName() !== 'CompleteProfile') {
        navigationRef.navigate('CompleteProfile', { prefilledRole: 'employee' });
      }
      return;
    }

    if (current?.kind === 'owner_onboarding' && user.role !== 'owner') {
      if (!activatingRoleRef.current) {
        activatingRoleRef.current = true;
        void useAuthStore.getState().completeProfile({ role: 'owner' }).finally(() => {
          activatingRoleRef.current = false;
        });
      }
      return;
    }

    if (current?.kind === 'employee_claim' && user.role !== 'employee') {
      if (getRootRouteName() !== 'CompleteProfile') {
        navigationRef.navigate('CompleteProfile', { prefilledRole: 'employee' });
      }
      return;
    }

    const resolved = usePendingAuthIntentStore.getState().consumeIntent();
    if (!resolved && getRootRouteName() !== 'Auth') return;

    const destination = getPostAuthDestination(resolved, user.role);
    const rootState = navigationRef.getRootState();
    logger.info('[Navigation] completing authentication', {
      intent: resolved?.kind ?? 'none',
      destination: destination.name,
      rootRoutesBefore: rootState.routes.map((route) => route.name),
    });
    navigationRef.dispatch(
      buildPostAuthRootAction(
        rootState.routes.map((route) => route.name),
        destination,
      ),
    );
  }, [intent, intentHydrated, isAuthenticated, profileComplete, user]);

  return null;
}

export default function RootNavigator() {
  const { user, isOnboardingCompleted, isHydrated } = useAuthStore();
  const role = user?.role;

  // Wait until rehydration completes to prevent a flash of the onboarding screen on launch
  if (!isHydrated) {
    return null;
  }

  if (!isOnboardingCompleted) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <>
      <PostAuthIntentCoordinator />
      <Stack.Navigator
        initialRouteName={role === 'owner' || role === 'employee' ? 'OwnerTabs' : 'CustomerTabs'}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
        <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={AUTH_MODAL_OPTIONS}
        />
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfileScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </>
  );
}
