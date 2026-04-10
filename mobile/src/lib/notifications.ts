import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

/**
 * Request notification permissions. Call this once (e.g., on first booking).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a local reminder notification 1 hour before a booking.
 * @param bookingDate - "YYYY-MM-DD"
 * @param timeSlot - "HH:MM"
 * @param salonName - Name of the salon
 * @param serviceName - Name of the service
 */
export async function scheduleBookingReminder(
  bookingDate: string,
  timeSlot: string,
  salonName: string,
  serviceName: string
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Parse booking datetime
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const bookingTime = new Date(bookingDate);
  bookingTime.setHours(hours, minutes, 0, 0);

  // Schedule 1 hour before
  const reminderTime = new Date(bookingTime.getTime() - 60 * 60 * 1000);

  // Don't schedule if reminder time is in the past
  if (reminderTime <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Appointment',
      body: `Your ${serviceName} at ${salonName} is in 1 hour (${timeSlot})`,
      sound: true,
      data: { type: 'booking_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
    },
  });

  return id;
}

/**
 * Cancel a scheduled notification by ID.
 */
export async function cancelBookingReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
