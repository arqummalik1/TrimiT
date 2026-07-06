import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OwnerDashboardStackParamList } from './types';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import ChooseBusinessTypeScreen from '../screens/owner/ChooseBusinessTypeScreen';
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
      <Stack.Screen name="ChooseBusinessType" component={ChooseBusinessTypeScreen} />
      <Stack.Screen name="ManageSalon" component={ManageSalonScreen} />
    </Stack.Navigator>
  );
}
