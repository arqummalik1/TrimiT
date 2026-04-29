import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and sync token with backend
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  // CRITICAL: Prevent crashes in Expo Go SDK 53+
  if (Constants.appOwnership === 'expo') {
    console.warn('[Notifications] Push notifications are not supported in Expo Go (SDK 53+). Use a development build.');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;

    console.log('Push Token:', token);

    // Sync token with backend
    await api.post('/api/auth/push-token', { push_token: token });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (error) {
    console.error('[Notifications] Error registering push token:', error);
  }
}

/**
 * Handle user interaction with notifications (Deep Linking)
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse, navRef: any) {
  const data = response.notification.request.content.data;
  
  if (!navRef.isReady()) return;

  // Example data structure: { type: 'new_booking', booking_id: '...' }
  if (data.type === 'new_booking' || data.type === 'booking_update') {
    // Navigate to the Bookings tab
    const state = navRef.getRootState();
    const currentRoute = state?.routes[state.index]?.name;

    if (currentRoute === 'OwnerTabs') {
      navRef.navigate('OwnerTabs', { screen: 'Bookings' });
    } else if (currentRoute === 'CustomerTabs') {
      navRef.navigate('CustomerTabs', { screen: 'Bookings' });
    }
  }
}

/**
 * Schedule a local reminder for a booking (Fallback/Legacy)
 */
export async function scheduleBookingReminder(
  date: string,
  time: string,
  salonName: string,
  serviceName: string
) {
  if (Platform.OS === 'web') return;

  const bookingDate = new Date(`${date}T${time}`);
  const trigger = new Date(bookingDate.getTime() - 60 * 60 * 1000); // 1 hour before

  if (trigger < new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Appointment',
      body: `You have a ${serviceName} at ${salonName} in 1 hour.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}
