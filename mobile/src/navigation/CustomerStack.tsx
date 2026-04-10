import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerDiscoverStackParamList } from './types';
import { DiscoverScreen } from '../screens/customer/DiscoverScreen';
import SalonDetailScreen from '../screens/customer/SalonDetailScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import WriteReviewScreen from '../screens/customer/WriteReviewScreen';

const Stack = createNativeStackNavigator<CustomerDiscoverStackParamList>();

export default function CustomerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <Stack.Screen name="SalonDetail" component={SalonDetailScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
    </Stack.Navigator>
  );
}
