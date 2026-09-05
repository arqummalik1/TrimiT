import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OwnerOnboardingStackParamList } from './types';
import ChooseBusinessTypeScreen from '../screens/owner/ChooseBusinessTypeScreen';
import ManageSalonScreen from '../screens/owner/ManageSalonScreen';

const Stack = createNativeStackNavigator<OwnerOnboardingStackParamList>();

/**
 * Reversible customer -> salon setup flow.
 *
 * CustomerTabs remains immediately below this root screen. Therefore iOS back
 * gestures, Android hardware back, and the visible header back button all have
 * a real customer destination until salon creation succeeds.
 */
export default function OwnerOnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ChooseBusinessType" component={ChooseBusinessTypeScreen} />
      <Stack.Screen name="ManageSalon" component={ManageSalonScreen} />
    </Stack.Navigator>
  );
}
