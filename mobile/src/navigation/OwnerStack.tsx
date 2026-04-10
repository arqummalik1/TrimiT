import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OwnerDashboardStackParamList } from './types';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import ManageSalonScreen from '../screens/owner/ManageSalonScreen';

const Stack = createNativeStackNavigator<OwnerDashboardStackParamList>();

export default function OwnerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DashboardMain" component={OwnerDashboardScreen} />
      <Stack.Screen name="ManageSalon" component={ManageSalonScreen} />
    </Stack.Navigator>
  );
}
