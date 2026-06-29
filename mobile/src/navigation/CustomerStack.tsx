import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerDiscoverStackParamList } from './types';
import { DiscoverScreen } from '../screens/customer/DiscoverScreen';
import SalonDetailScreen from '../screens/customer/SalonDetailScreen';
import ServiceDetailScreen from '../screens/customer/ServiceDetailScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import RescheduleBookingScreen from '../screens/customer/RescheduleBookingScreen';
import PaymentWaitingScreen from '../screens/customer/PaymentWaitingScreen';
import WriteReviewScreen from '../screens/customer/WriteReviewScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import ContactScreen from '../screens/legal/ContactScreen';
import PaymentsHelpScreen from '../screens/legal/PaymentsHelpScreen';

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
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="RescheduleBooking" component={RescheduleBookingScreen} />
      <Stack.Screen name="PaymentWaiting" component={PaymentWaitingScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="PaymentsHelp" component={PaymentsHelpScreen} />
    </Stack.Navigator>
  );
}
